import {
  createCutPlanner,
  SAMPLE_RATE,
  type PlannedPiece,
} from './cut.planner';
import { decodeAudio } from './ffmpeg.decoder';
import { toWav } from './wav';

export type AudioPiece = {
  // 0, 1, 2… in order. The same file always gives the same pieces.
  seq: number;
  // From the start of the recording. Each piece starts where the last ended.
  startMs: number;
  durationMs: number;
  // A .wav file.
  audio: Buffer;
  mimeType: 'audio/wav';
};

type ReadPiecesOptions = {
  signal?: AbortSignal;
  // Injected in tests.
  ffmpegPath?: string;
  stallTimeoutMs?: number;
};

// The audio of `source` (a URL or a file path) as ~30s pieces, cut at quiet
// moments, one at a time. The next piece is only read once the caller asks
// for it, so memory stays at about one piece. Stopping early stops ffmpeg.
// Throws AudioError when the file can't be read.
export async function* readPieces(
  source: string,
  options: ReadPiecesOptions = {},
): AsyncGenerator<AudioPiece> {
  const planner = createCutPlanner();
  let seq = 0;
  for await (const samples of decodeAudio(source, options)) {
    for (const piece of planner.push(samples)) yield toAudioPiece(piece, seq++);
  }
  for (const piece of planner.end()) yield toAudioPiece(piece, seq++);
}

function toAudioPiece(piece: PlannedPiece, seq: number): AudioPiece {
  // From sample offsets, so pieces line up exactly: rounding never leaves a
  // gap or an overlap between one piece's end and the next one's start.
  const startMs = toMs(piece.startSample);
  const endMs = toMs(piece.startSample + piece.samples.length);
  return {
    seq,
    startMs,
    durationMs: endMs - startMs,
    audio: toWav(piece.samples, SAMPLE_RATE),
    mimeType: 'audio/wav',
  };
}

function toMs(sample: number) {
  return Math.round((sample * 1000) / SAMPLE_RATE);
}
