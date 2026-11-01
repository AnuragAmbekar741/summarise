import { execFile } from 'node:child_process';
import { createReadStream, mkdtempSync } from 'node:fs';
import { rm, stat, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AudioError } from '../audio.errors';
import { readPieces, type AudioPiece } from '../audio.pieces';
import { decodeAudio } from '../ffmpeg.decoder';

const run = promisify(execFile);

// A 70s "lecture": a tone with 1s of silence at 28–29s and 58–59s.
const PAUSES = [28, 58];
const LECTURE_MS = 70_000;
const TONE = `0.5*sin(2*PI*440*t)*not(between(t,28,29))*not(between(t,58,59))`;

// Runs real ffmpeg on files it generates itself, read from disk and over
// HTTP (as from the bucket).
describe('readPieces', () => {
  const dir = mkdtempSync(join(tmpdir(), 'summarise-audio-'));
  const file = (name: string) => join(dir, name);
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    // Quoted, so the formula's commas aren't read as filter separators.
    const tone = ['-f', 'lavfi', '-i', `aevalsrc='${TONE}':s=44100:d=70`];
    const video = ['-f', 'lavfi', '-i', 'color=c=black:s=64x64:r=5:d=70'];
    await Promise.all([
      ffmpeg([...tone, '-ac', '2', file('lecture.mp3')]),
      ffmpeg([...video, ...tone, '-c:v', 'mpeg4', file('lecture.mp4')]),
      ffmpeg([...tone, '-c:a', 'libopus', file('lecture.webm')]),
      ffmpeg([...video, '-c:v', 'mpeg4', file('no-audio.mp4')]),
      ffmpeg([
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=300:duration=600',
        file('long.mp3'),
      ]),
      writeFile(file('garbage.mp3'), Buffer.alloc(50_000, 7)),
    ]);
    server = await serve(dir);
    const address = server.address();
    if (typeof address !== 'object' || !address) throw new Error('no port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  }, 60_000);

  afterAll(async () => {
    // Including the stalled connection, which would otherwise stay open.
    server?.closeAllConnections();
    server?.close();
    await rm(dir, { recursive: true, force: true });
  });

  async function readAll(source: string) {
    const pieces: AudioPiece[] = [];
    for await (const piece of readPieces(source)) pieces.push(piece);
    return pieces;
  }

  // Checked on every result: numbered in order, back to back, and only the
  // last piece outside 25–35s.
  function expectWellFormed(pieces: AudioPiece[], totalMs: number) {
    let next = 0;
    pieces.forEach((piece, index) => {
      expect(piece.seq).toBe(index);
      expect(piece.startMs).toBe(next);
      next += piece.durationMs;
      if (index < pieces.length - 1) {
        expect(piece.durationMs).toBeGreaterThanOrEqual(25_000);
        expect(piece.durationMs).toBeLessThanOrEqual(35_000);
      }
    });
    // Encoders pad the end a little.
    expect(Math.abs(next - totalMs)).toBeLessThan(100);
  }

  function expectCutsInThePauses(pieces: AudioPiece[]) {
    const cuts = pieces.slice(1).map((piece) => piece.startMs / 1000);
    expect(cuts).toHaveLength(PAUSES.length);
    cuts.forEach((cut, index) => {
      // Encoders shift the audio by a few ms.
      expect(cut).toBeGreaterThanOrEqual(PAUSES[index]! - 0.1);
      expect(cut).toBeLessThanOrEqual(PAUSES[index]! + 1.1);
    });
  }

  it('cuts a lecture into pieces at its pauses', async () => {
    const pieces = await readAll(file('lecture.mp3'));

    expectWellFormed(pieces, LECTURE_MS);
    expectCutsInThePauses(pieces);
  });

  it('makes pieces that are real .wav files of the right length', async () => {
    const pieces = await readAll(file('lecture.mp3'));

    for (const piece of pieces) {
      const path = file(`piece-${piece.seq}.wav`);
      await writeFile(path, piece.audio);
      const { stdout } = await run('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration:stream=sample_rate,channels',
        '-of',
        'json',
        path,
      ]);
      const probe = JSON.parse(stdout);
      expect(probe.streams[0]).toMatchObject({
        sample_rate: '16000',
        channels: 1,
      });
      const ms = Number(probe.format.duration) * 1000;
      expect(Math.abs(ms - piece.durationMs)).toBeLessThan(2);
    }
  });

  it('reads video and webm over HTTP, cutting in the same places', async () => {
    for (const name of ['lecture.mp4', 'lecture.webm']) {
      const pieces = await readAll(`${baseUrl}/${name}`);

      expectWellFormed(pieces, LECTURE_MS);
      expectCutsInThePauses(pieces);
    }
  });

  it('gives the same pieces every time', async () => {
    const first = await readAll(file('lecture.mp3'));
    const second = await readAll(file('lecture.mp3'));

    expect(second).toEqual(first);
  });

  it.each([
    ['a video with no audio', 'no-audio.mp4'],
    ['a file that is not audio', 'garbage.mp3'],
    ['a file that does not exist', 'missing.mp3'],
  ])('fails for good on %s', async (_, name) => {
    const error = await readAll(file(name)).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AudioError);
    expect((error as AudioError).retryable).toBe(false);
  });

  it('fails for good when the URL is not found', async () => {
    const error = await readAll(`${baseUrl}/missing.mp3`).catch((e) => e);

    expect(error).toBeInstanceOf(AudioError);
    expect((error as AudioError).retryable).toBe(false);
  });

  // Slow: ffmpeg tries to reconnect for about 30s before giving up.
  it('fails, worth retrying, when the download breaks off', async () => {
    const error = await readAll(`${baseUrl}/cut-off/long.mp3`).catch((e) => e);

    expect(error).toBeInstanceOf(AudioError);
    expect((error as AudioError).retryable).toBe(true);
    expect((error as AudioError).message).toContain('Stream ends prematurely');
  }, 60_000);

  // Slow: after the stall, ffmpeg tries to reconnect for about 30s.
  it('fails, worth retrying, when the download stalls', async () => {
    const pieces = readPieces(`${baseUrl}/stall/long.mp3`, {
      stallTimeoutMs: 1_000,
    });
    const error = await (async () => {
      for await (const piece of pieces) void piece;
    })().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AudioError);
    expect((error as AudioError).retryable).toBe(true);
  }, 60_000);

  it('keeps the URL signature out of the error', async () => {
    const url = `${baseUrl}/missing.mp3?X-Amz-Signature=secret-signature`;

    const error = await readAll(url).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AudioError);
    expect((error as AudioError).message).toContain('/missing.mp3');
    expect((error as AudioError).message).not.toContain('secret-signature');
  });

  it('fails, worth retrying, when the server errors', async () => {
    const error = await readAll(`${baseUrl}/server-error`).catch((e) => e);

    expect(error).toBeInstanceOf(AudioError);
    expect((error as AudioError).retryable).toBe(true);
  });

  it('fails, worth retrying, when ffmpeg is not installed', async () => {
    const pieces = readPieces(file('lecture.mp3'), {
      ffmpegPath: 'ffmpeg-not-installed',
    });
    const error = await pieces.next().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AudioError);
    expect((error as AudioError).retryable).toBe(true);
  });

  it('keeps samples whole when output stops halfway through one', async () => {
    // A stand-in for ffmpeg that writes samples 1, 2, 3 as 3 bytes, a pause,
    // then 3 more, so the first read ends in the middle of sample 2.
    const fake = file('fake-ffmpeg.sh');
    await writeFile(
      fake,
      "#!/bin/sh\nprintf '\\001\\000\\002'\nsleep 0.2\nprintf '\\000\\003\\000'\n",
      { mode: 0o755 },
    );

    const samples: number[] = [];
    for await (const chunk of decodeAudio('unused', { ffmpegPath: fake })) {
      samples.push(...chunk);
    }

    expect(samples).toEqual([1, 2, 3]);
  });

  it('stops ffmpeg when the caller stops reading', async () => {
    const path = file('long.mp3');
    const pieces = readPieces(path);
    await pieces.next();
    // Still running: it waits for the rest to be read.
    expect(await isRunning(path)).toBe(true);

    await pieces.return(undefined);

    await expectStopped(path);
  });

  it('stops ffmpeg and throws when the signal fires', async () => {
    const path = file('long.mp3');
    const controller = new AbortController();
    const pieces = readPieces(path, { signal: controller.signal });
    await pieces.next();
    expect(await isRunning(path)).toBe(true);

    controller.abort();

    const error = await pieces.next().catch((e: unknown) => e);
    expect((error as Error).name).toBe('AbortError');
    await expectStopped(path);
  });
});

async function ffmpeg(args: string[]) {
  await run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
}

// An ffmpeg process reading `path`.
async function isRunning(path: string) {
  try {
    await run('pgrep', ['-f', path]);
    return true;
  } catch {
    return false;
  }
}

async function expectStopped(path: string) {
  // Up to 3s, for a slow machine.
  for (let i = 0; i < 60 && (await isRunning(path)); i++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  expect(await isRunning(path)).toBe(false);
}

// Serves files from `dir` with byte ranges, like the bucket does, ignoring
// any query. `/server-error` answers 500. `/cut-off/<name>` drops the
// connection after a third of the file, and `/stall/<name>` goes silent
// after 64 KB without closing it; both answer 500 to the reconnect.
function serve(dir: string): Promise<Server> {
  const server = createServer(async (request, response) => {
    let name = (request.url ?? '/').slice(1).split('?')[0]!;
    if (name === 'server-error') {
      response.writeHead(500).end();
      return;
    }
    const mode = /^(cut-off|stall)\//.exec(name)?.[1];
    if (mode) {
      if (request.headers.range && !/bytes=0-/.test(request.headers.range)) {
        response.writeHead(500).end();
        return;
      }
      name = name.slice(mode.length + 1);
    }
    const cutOff = mode === 'cut-off';
    if (mode === 'stall') {
      const size = (await stat(join(dir, name))).size;
      // Byte ranges, so the reconnect asks to resume rather than restart.
      response.writeHead(200, {
        'Accept-Ranges': 'bytes',
        'Content-Length': size,
      });
      createReadStream(join(dir, name), { start: 0, end: 65_535 }).pipe(
        response,
        { end: false },
      );
      return;
    }
    const path = join(dir, name);
    const size = await stat(path).then(
      (info) => info.size,
      () => undefined,
    );
    if (size === undefined) {
      response.writeHead(404).end();
      return;
    }
    const range = /bytes=(\d+)-(\d*)/.exec(request.headers.range ?? '');
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Number(range[2]) : size - 1;
    response.writeHead(range ? 206 : 200, {
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      ...(range && { 'Content-Range': `bytes ${start}-${end}/${size}` }),
    });
    if (cutOff) {
      const third = Math.floor(size / 3);
      createReadStream(path, { start: 0, end: third })
        .on('end', () => response.destroy())
        .pipe(response, { end: false });
      return;
    }
    createReadStream(path, { start, end }).pipe(response);
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve(server)),
  );
}
