import { setTimeout as sleep } from 'node:timers/promises';

import { uploadKey, type ObjectStore } from '@summarise/blob';
import { logger } from '@summarise/logger';
import {
  SpeechToTextError,
  type SpeechToText,
} from '@summarise/speech-to-text';
import type {
  Note,
  NoteRepository,
  TranscriptSegment,
  TranscriptSegmentRepository,
} from '@summarise/storage';

import { readPieces, type AudioPiece } from '../audio/audio.pieces';
import { probeDurationMs } from '../audio/ffprobe';

// Long enough for the slowest job: ffmpeg reuses the URL to reconnect.
const URL_VALID_SECONDS = 6 * 60 * 60;
// Audio past this is not transcribed.
const MAX_AUDIO_MS = 4 * 60 * 60 * 1000;
// How much of the previous piece's text to send as context.
const PROMPT_CHARS = 200;
// Tries per piece when the provider is busy or down, before giving up.
const MAX_ATTEMPTS = 5;
// When the provider doesn't say how long to wait: 5s, 10s, 20s, 40s.
const FIRST_RETRY_MS = 5_000;
// Asked to wait longer (a daily limit), the job gives up for now instead of
// holding a worker slot; a later retry picks it up.
const MAX_WAIT_MS = 2 * 60 * 1000;
// Never retry straight away, even when told to.
const MIN_WAIT_MS = 1_000;
// Waits before trying again after the provider rejects our setup (the key
// or the model). Still rejected after these, the error is thrown, and the
// worker pauses every job until the setup works.
const SETUP_RETRY_MS = [5_000, 10_000, 15_000];

type UploadTranscriberDeps = {
  blob: Pick<ObjectStore, 'presignGet' | 'delete'>;
  notes: NoteRepository;
  segments: TranscriptSegmentRepository;
  speechToText: SpeechToText;
  // Injected in tests.
  maxAudioMs?: number;
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
  probe?: (source: string) => Promise<number | undefined>;
  // Called after each piece is saved (to forget earlier failed runs).
  onPieceSaved?: (noteId: string) => Promise<void>;
};

// Turns an uploaded file into the note's transcript: each ~30s piece is
// transcribed and saved as a segment, then the note is marked ready and the
// file deleted. Pieces saved by an earlier, interrupted run are skipped, so
// a retried job carries on where the last one stopped. Before each new piece
// it checks the note is still processing: paused, stopped early or deleted,
// it stops there.
export function createUploadTranscriber({
  blob,
  notes,
  segments,
  speechToText,
  maxAudioMs = MAX_AUDIO_MS,
  wait = (ms, signal) => sleep(ms, undefined, { signal }),
  probe = probeDurationMs,
  onPieceSaved,
}: UploadTranscriberDeps) {
  // One piece's text, trying again while the provider is busy. A piece the
  // provider rejects for good is saved as a gap, as with live recording.
  // Null when the note stopped processing meanwhile; nothing was saved.
  async function transcribePiece(
    note: Note,
    piece: AudioPiece,
    previousText: string,
    signal: AbortSignal,
  ): Promise<string | null> {
    // Counted apart, so setup retries don't use up the busy ones.
    let setupFailures = 0;
    let busyFailures = 0;
    for (;;) {
      try {
        const { text } = await speechToText.transcribe({
          audio: piece.audio,
          mimeType: piece.mimeType,
          prompt: previousText.slice(-PROMPT_CHARS) || undefined,
          signal,
        });
        return (await save(note, piece, text, false, signal)) ? text : null;
      } catch (error) {
        if (!(error instanceof SpeechToTextError)) throw error;
        if (error.setupError) {
          const ms = SETUP_RETRY_MS[setupFailures++];
          if (ms === undefined) throw error;
          await wait(ms, signal);
          continue;
        }
        if (!error.retryable) {
          logger.warn(
            { err: error, noteId: note.id, seq: piece.seq },
            'piece could not be transcribed',
          );
          return (await save(note, piece, '', true, signal)) ? '' : null;
        }
        busyFailures++;
        if (busyFailures === MAX_ATTEMPTS) throw error;
        const ms =
          error.retryAfterSeconds !== undefined
            ? error.retryAfterSeconds * 1000
            : FIRST_RETRY_MS * 2 ** (busyFailures - 1);
        if (ms > MAX_WAIT_MS) throw error;
        await wait(Math.max(ms, MIN_WAIT_MS), signal);
      }
    }
  }

  async function stillProcessing(noteId: string) {
    return (await notes.findById(noteId))?.status === 'processing';
  }

  async function save(
    note: Note,
    piece: AudioPiece,
    text: string,
    failed: boolean,
    signal: AbortSignal,
  ): Promise<boolean> {
    // The lock was lost: another worker may be saving this note now.
    signal.throwIfAborted();
    // Paused, stopped or deleted while this piece was transcribed: a stopped
    // note is already ready with the pieces before this one.
    if (!(await stillProcessing(note.id))) return false;
    await segments.upsert({
      noteId: note.id,
      seq: piece.seq,
      startMs: piece.startMs,
      endMs: piece.startMs + piece.durationMs,
      rawText: text,
      transcriptionFailed: failed,
    });
    await onPieceSaved?.(note.id).catch((error: unknown) =>
      logger.warn({ err: error, noteId: note.id }, 'piece progress not noted'),
    );
    return true;
  }

  return {
    async transcribe(note: Note, signal: AbortSignal): Promise<void> {
      const key = uploadKey(note.id);
      const url = await blob.presignGet(key, URL_VALID_SECONDS);
      // The length up front, so the app can show how far it has got
      // ("18:20 of 60:00"). Replaced by the exact length once done.
      if (note.durationMs === null) {
        const durationMs = await probe(url);
        if (durationMs !== undefined) {
          await notes.setUploadLength(
            note.id,
            Math.min(durationMs, maxAudioMs),
          );
        }
      }
      const saved = new Map(
        (await segments.listByNote(note.id)).map((s) => [s.seq, s]),
      );

      let previousText = '';
      let totalChunks = 0;
      let durationMs = 0;
      for await (const piece of readPieces(url, { signal })) {
        if (piece.startMs >= maxAudioMs) {
          logger.warn(
            { noteId: note.id, maxAudioMs },
            'upload too long; transcribed only the start',
          );
          break;
        }
        const done = saved.get(piece.seq);
        if (!done && !(await stillProcessing(note.id))) {
          logger.info(
            { noteId: note.id, seq: piece.seq },
            'upload no longer processing; stopped transcribing',
          );
          return;
        }
        const text = done
          ? textOf(done)
          : await transcribePiece(note, piece, previousText, signal);
        if (text === null) {
          logger.info(
            { noteId: note.id, seq: piece.seq },
            'upload no longer processing; stopped transcribing',
          );
          return;
        }
        previousText = text;
        totalChunks = piece.seq + 1;
        durationMs = piece.startMs + piece.durationMs;
      }

      signal.throwIfAborted();
      const ready = await notes.finishUpload(note.id, {
        totalChunks,
        durationMs,
      });
      // Deleted, or another worker finished it first.
      if (!ready) {
        logger.warn({ noteId: note.id }, 'upload not marked ready');
        return;
      }
      // The transcript is saved; a file left behind only costs storage.
      await blob
        .delete(key)
        .catch((error: unknown) =>
          logger.error({ err: error, noteId: note.id }, 'upload not deleted'),
        );
      logger.info(
        { noteId: note.id, totalChunks, durationMs },
        'upload transcribed',
      );
    },
  };
}

export type UploadTranscriber = ReturnType<typeof createUploadTranscriber>;

function textOf(segment: TranscriptSegment) {
  return segment.editedText ?? segment.rawText;
}
