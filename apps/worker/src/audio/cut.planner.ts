// Splits a stream of 16 kHz mono samples into ~30s pieces, each cut at a
// quiet moment so no word is split. The same rules as live recording: a
// piece is cut somewhere between 25s and 35s.

export const SAMPLE_RATE = 16_000;
const samples = (ms: number) => (ms * SAMPLE_RATE) / 1000;

const CUT_FROM = samples(25_000);
const CUT_BY = samples(35_000);
// How long a stretch is compared when looking for the quietest moment.
const QUIET_WINDOW = samples(300);
// Cut points are tried every 10ms.
const BLOCK = samples(10);
const WINDOW_BLOCKS = QUIET_WINDOW / BLOCK;
// A last piece shorter than this is added to the one before it.
const MIN_PIECE = samples(1_000);

export type PlannedPiece = {
  // Offset of the piece's first sample from the start of the audio.
  startSample: number;
  samples: Int16Array;
};

// Push samples in as they arrive; pieces come out once they're decided.
// The cuts depend only on the audio, not on how it was split into pushes,
// so the same file always gives the same pieces.
export function createCutPlanner() {
  let buffered: Int16Array[] = [];
  let bufferedLength = 0;
  // Offset of the first buffered sample.
  let bufferedStart = 0;
  // The last piece cut, held back until we know the audio after it isn't a
  // tiny tail that belongs on its end.
  let held: PlannedPiece | undefined;

  function takeBuffered(): Int16Array {
    const audio = concat(buffered, bufferedLength);
    buffered = [];
    bufferedLength = 0;
    return audio;
  }

  // Returns the piece it replaces as `held`, if any.
  function hold(piece: PlannedPiece): PlannedPiece[] {
    const ready = held ? [held] : [];
    held = piece;
    return ready;
  }

  return {
    push(chunk: Int16Array): PlannedPiece[] {
      if (chunk.length > 0) {
        buffered.push(chunk);
        bufferedLength += chunk.length;
      }
      const ready: PlannedPiece[] = [];
      while (bufferedLength >= CUT_BY) {
        const audio = takeBuffered();
        const at = quietestPoint(audio);
        // A copy, so the piece doesn't keep the whole buffer in memory.
        ready.push(
          ...hold({ startSample: bufferedStart, samples: audio.slice(0, at) }),
        );
        const rest = audio.subarray(at);
        buffered = [rest];
        bufferedLength = rest.length;
        bufferedStart += at;
      }
      return ready;
    },

    // Call once the audio has ended: returns the last piece or two.
    end(): PlannedPiece[] {
      const tail = takeBuffered();
      if (tail.length === 0) return held ? [held] : [];
      if (held && tail.length < MIN_PIECE) {
        const merged = concat([held.samples, tail]);
        return [{ startSample: held.startSample, samples: merged }];
      }
      const last = { startSample: bufferedStart, samples: tail };
      return held ? [held, last] : [last];
    },
  };
}

// Where to cut `audio` (at least CUT_BY samples long): the centre of the
// quietest 300ms stretch that lies within 24.85s–35s, so the cut falls
// between 25s and 34.85s. Comparing
// stretches with each other, instead of against a fixed volume, works in a
// noisy room and with a quiet microphone alike. Reads only the first CUT_BY
// samples.
function quietestPoint(audio: Int16Array): number {
  const from = CUT_FROM - QUIET_WINDOW / 2;
  const blockCount = (CUT_BY - from) / BLOCK;
  // Sums of squares are whole numbers well below 2^53, so the running total
  // below stays exact.
  const energy = new Float64Array(blockCount);
  for (let block = 0; block < blockCount; block++) {
    let sum = 0;
    const start = from + block * BLOCK;
    for (let i = start; i < start + BLOCK; i++) {
      const sample = audio[i]!;
      sum += sample * sample;
    }
    energy[block] = sum;
  }

  let window = 0;
  for (let block = 0; block < WINDOW_BLOCKS; block++) window += energy[block]!;
  let quietest = window;
  let quietestStart = 0;
  for (let start = 1; start + WINDOW_BLOCKS <= blockCount; start++) {
    window += energy[start + WINDOW_BLOCKS - 1]! - energy[start - 1]!;
    // Strictly quieter, so a tie keeps the earliest point.
    if (window < quietest) {
      quietest = window;
      quietestStart = start;
    }
  }
  return from + (quietestStart + WINDOW_BLOCKS / 2) * BLOCK;
}

function concat(parts: Int16Array[], length?: number): Int16Array {
  if (parts.length === 1) return parts[0]!;
  const total = length ?? parts.reduce((sum, part) => sum + part.length, 0);
  const joined = new Int16Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
  }
  return joined;
}
