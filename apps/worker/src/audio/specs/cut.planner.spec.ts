import { describe, expect, it } from 'vitest';

import {
  createCutPlanner,
  SAMPLE_RATE,
  type PlannedPiece,
} from '../cut.planner';

const samples = (ms: number) => (ms * SAMPLE_RATE) / 1000;
const msOf = (count: number) => (count * 1000) / SAMPLE_RATE;

// Made-up audio, built from stretches: `loud` is how loud each sample can
// be (0 is silence). Noise from a fixed seed, so every run is the same.
type Stretch = { ms: number; loud: number };
function audio(stretches: Stretch[]): Int16Array {
  const total = stretches.reduce((sum, s) => sum + samples(s.ms), 0);
  const out = new Int16Array(total);
  let seed = 1;
  let offset = 0;
  for (const { ms, loud } of stretches) {
    for (let i = 0; i < samples(ms); i++) {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      out[offset++] = Math.round(((seed / 2_147_483_648) * 2 - 1) * loud);
    }
  }
  return out;
}

// Speech with a 1s pause at each of `pauses` (in seconds), up to `totalMs`.
function speechWithPauses(
  totalMs: number,
  pauses: number[],
  { speech = 8_000, pause = 0 } = {},
): Int16Array {
  const stretches: Stretch[] = [];
  let at = 0;
  for (const second of pauses) {
    stretches.push({ ms: second * 1000 - at, loud: speech });
    stretches.push({ ms: 1000, loud: pause });
    at = second * 1000 + 1000;
  }
  stretches.push({ ms: totalMs - at, loud: speech });
  return audio(stretches);
}

function cutAll(input: Int16Array, chunkSize = 4_096): PlannedPiece[] {
  const planner = createCutPlanner();
  const pieces: PlannedPiece[] = [];
  for (let i = 0; i < input.length; i += chunkSize) {
    pieces.push(...planner.push(input.subarray(i, i + chunkSize)));
  }
  pieces.push(...planner.end());
  return pieces;
}

// Checked on every result: the pieces cover the audio exactly, back to
// back, with the same samples, and only the last can be outside 25–35s.
function expectWellFormed(pieces: PlannedPiece[], input: Int16Array) {
  let next = 0;
  pieces.forEach((piece, index) => {
    expect(piece.startSample).toBe(next);
    // Byte for byte; toEqual on ~500k samples is too slow.
    const expected = input.subarray(next, next + piece.samples.length);
    expect(bytes(piece.samples).equals(bytes(expected))).toBe(true);
    next += piece.samples.length;
    if (index < pieces.length - 1) {
      expect(msOf(piece.samples.length)).toBeGreaterThanOrEqual(25_000);
      expect(msOf(piece.samples.length)).toBeLessThanOrEqual(35_000);
    }
  });
  expect(next).toBe(input.length);
}

function bytes(samples: Int16Array) {
  return Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
}

// Where each cut falls, in seconds from the start.
function cutPoints(pieces: PlannedPiece[]) {
  return pieces.slice(1).map((piece) => msOf(piece.startSample) / 1000);
}

function expectEachCutInAPause(pieces: PlannedPiece[], pauses: number[]) {
  const cuts = cutPoints(pieces);
  expect(cuts).toHaveLength(pauses.length);
  cuts.forEach((cut, index) => {
    const pause = pauses[index]!;
    expect(cut).toBeGreaterThanOrEqual(pause);
    expect(cut).toBeLessThanOrEqual(pause + 1);
  });
}

describe('cut planner', () => {
  it('cuts in the pauses', () => {
    const pauses = [27, 58, 88];
    const input = speechWithPauses(110_000, pauses);

    const pieces = cutAll(input);

    expectWellFormed(pieces, input);
    expectEachCutInAPause(pieces, pauses);
  });

  it('cuts in the pauses of a noisy room', () => {
    // The "pauses" are only quieter, never silent.
    const pauses = [30, 62];
    const input = speechWithPauses(90_000, pauses, {
      speech: 12_000,
      pause: 3_000,
    });

    const pieces = cutAll(input);

    expectWellFormed(pieces, input);
    expectEachCutInAPause(pieces, pauses);
  });

  it('cuts in the pauses of a quiet microphone', () => {
    const pauses = [26, 60];
    const input = speechWithPauses(80_000, pauses, { speech: 60, pause: 2 });

    const pieces = cutAll(input);

    expectWellFormed(pieces, input);
    expectEachCutInAPause(pieces, pauses);
  });

  it('still cuts within 25–35s when there is no pause', () => {
    const input = audio([{ ms: 200_000, loud: 8_000 }]);

    const pieces = cutAll(input);

    expectWellFormed(pieces, input);
    expect(pieces.length).toBeGreaterThanOrEqual(6);
  });

  it('gives the same pieces however the audio arrives', () => {
    const input = speechWithPauses(120_000, [28, 61, 93]);

    const whole = cutAll(input, input.length);
    const small = cutAll(input, 1_000);
    const odd = cutAll(input, 77_777);

    expect(cutPoints(small)).toEqual(cutPoints(whole));
    expect(cutPoints(odd)).toEqual(cutPoints(whole));
  });

  it('adds a last piece under 1s to the one before it', () => {
    // Cut early in the pause at 34s (about 34.15s), leaving under 1s.
    const input = speechWithPauses(35_100, [34]);

    const pieces = cutAll(input);

    expectWellFormed(pieces, input);
    expect(pieces).toHaveLength(1);
  });

  it('keeps a last piece of 1s or more', () => {
    const input = speechWithPauses(40_000, [30]);

    const pieces = cutAll(input);

    expectWellFormed(pieces, input);
    expect(pieces).toHaveLength(2);
  });

  it('gives one piece for audio under 25s, however short', () => {
    for (const ms of [20_000, 400]) {
      const input = audio([{ ms, loud: 8_000 }]);

      const pieces = cutAll(input);

      expectWellFormed(pieces, input);
      expect(pieces).toHaveLength(1);
    }
  });

  it('gives no pieces for no audio', () => {
    expect(cutAll(new Int16Array(0))).toEqual([]);
  });
});
