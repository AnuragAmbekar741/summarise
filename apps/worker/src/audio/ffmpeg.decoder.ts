import { spawn } from 'node:child_process';

import { logger } from '@summarise/logger';

import { AudioError } from './audio.errors';
import { SAMPLE_RATE } from './cut.planner';

// How much of ffmpeg's error output to keep for the error message.
const STDERR_KEEP_CHARS = 4_000;

// ffmpeg errors that mean the file itself is the problem: trying again gives
// the same result. Anything else (network, server) is worth retrying.
const PERMANENT_ERRORS = [
  /Invalid data found when processing input/,
  /matches no streams/,
  /does not contain any stream/,
  /Server returned 404/,
  /No such file or directory/,
];

// ffmpeg exits as if it had finished when the download breaks off and
// reconnecting fails. Without this, the rest of the lecture would be
// silently missing. Seen in its error output, at any exit code.
const CUT_OFF_ERRORS = [
  /Stream ends prematurely/,
  /Input\/output error/,
  /Connection (reset|refused|timed out)/,
  /Server returned/,
];

type DecodeOptions = {
  // Stops ffmpeg and makes the decode throw `signal.reason`.
  signal?: AbortSignal;
  // Injected in tests.
  ffmpegPath?: string;
  // A download that sends nothing for this long is treated as dropped (and
  // reconnected), rather than waited on forever. URLs only.
  stallTimeoutMs?: number;
};

// Decodes the first audio track of `source` (a URL or a file path) into
// 16 kHz mono samples, streamed as they're decoded. Nothing is written to
// disk. Reading slowly is fine: ffmpeg waits until the samples are taken.
// ffmpeg is stopped when the caller stops reading, or the signal fires.
export async function* decodeAudio(
  source: string,
  {
    signal,
    ffmpegPath = 'ffmpeg',
    stallTimeoutMs = 60_000,
  }: DecodeOptions = {},
): AsyncGenerator<Int16Array> {
  signal?.throwIfAborted();
  const ffmpeg = spawn(ffmpegPath, ffmpegArgs(source, stallTimeoutMs), {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Always read the error output: if nobody does, ffmpeg stops once its
  // pipe is full.
  let stderr = '';
  ffmpeg.stderr.setEncoding('utf8');
  ffmpeg.stderr.on('data', (text: string) => {
    stderr = (stderr + text).slice(-STDERR_KEEP_CHARS);
  });
  const exited = new Promise<number | null>((resolve, reject) => {
    ffmpeg.once('error', reject);
    ffmpeg.once('close', (code) => resolve(code));
  });
  // Without a handler, a failed spawn rejects `exited` before it's awaited.
  exited.catch(() => undefined);

  const stop = () => ffmpeg.kill('SIGKILL');
  signal?.addEventListener('abort', stop, { once: true });
  try {
    // A sample is 2 bytes, and a chunk can end halfway through one.
    let carry: Buffer | undefined;
    for await (const data of ffmpeg.stdout as AsyncIterable<Buffer>) {
      const bytes = carry ? Buffer.concat([carry, data]) : data;
      const whole = bytes.length - (bytes.length % 2);
      carry = whole < bytes.length ? bytes.subarray(whole) : undefined;
      if (whole > 0) yield toSamples(bytes.subarray(0, whole));
    }

    let code: number | null;
    try {
      code = await exited;
    } catch (error) {
      throw new AudioError(`could not start ffmpeg: ${String(error)}`, {
        retryable: true,
        cause: error,
      });
    }
    signal?.throwIfAborted();
    // ffmpeg's messages repeat the source; a presigned URL's signature must
    // not reach errors or logs. Drops the query of any URL in them.
    const output = stderr.replace(/(https?:\/\/[^\s?]+)\?\S*/g, '$1').trim();
    if (
      code !== 0 &&
      PERMANENT_ERRORS.some((pattern) => pattern.test(output))
    ) {
      throw new AudioError(`ffmpeg failed (${code}): ${output}`, {
        retryable: false,
      });
    }
    if (code !== 0 || CUT_OFF_ERRORS.some((pattern) => pattern.test(output))) {
      throw new AudioError(`ffmpeg failed (${code}): ${output}`, {
        retryable: true,
      });
    }
    // Finished, but complained: usually a damaged part that was skipped.
    if (output) {
      logger.warn(
        { source: redact(source), stderr: output },
        'ffmpeg warnings',
      );
    }
  } finally {
    signal?.removeEventListener('abort', stop);
    if (ffmpeg.exitCode === null && ffmpeg.signalCode === null) stop();
  }
}

function ffmpegArgs(source: string, stallTimeoutMs: number): string[] {
  // A long pause while the caller works can drop the download; these make
  // ffmpeg reconnect and carry on from where it was. URLs only.
  const reconnect = /^https?:\/\//.test(source)
    ? [
        // In microseconds.
        '-rw_timeout',
        String(stallTimeoutMs * 1000),
        '-reconnect',
        '1',
        '-reconnect_streamed',
        '1',
        '-reconnect_on_network_error',
        '1',
        '-reconnect_delay_max',
        '30',
      ]
    : [];
  return [
    '-nostdin',
    '-hide_banner',
    '-loglevel',
    'error',
    ...reconnect,
    '-i',
    source,
    // The first audio track; any video is ignored.
    '-map',
    '0:a:0',
    '-vn',
    // Fill gaps in the file's timestamps (common in browser recordings) with
    // silence, starting from 0, so sample counts match the real timeline.
    '-af',
    'aresample=async=1:first_pts=0',
    '-ac',
    '1',
    '-ar',
    String(SAMPLE_RATE),
    '-f',
    's16le',
    'pipe:1',
  ];
}

// Copied, so the samples start at an even byte offset and don't hold on to
// the pipe's buffer. Little-endian, as on x86 and ARM.
function toSamples(bytes: Buffer): Int16Array {
  const samples = new Int16Array(bytes.length / 2);
  Buffer.from(samples.buffer).set(bytes);
  return samples;
}

// A presigned URL carries a signature; keep it out of the logs.
function redact(source: string) {
  return source.split('?')[0] ?? '';
}
