import type { BlobStore } from '@summarise/blob';
import type {
  PublicTranscriptSegment,
  UploadChunkInput,
} from '@summarise/contract';
import {
  SpeechToTextError,
  type SpeechToText,
} from '@summarise/speech-to-text';
import { logger } from '@summarise/logger';
import type { Note } from '@summarise/storage';

import { HttpError } from '../../common/error.utils';
import type { NoteService } from '../note/note.service';
import type { TranscriptService } from '../transcript/transcript.service';
import { chunkKey } from './utils/recording.utils';

// How much of the previous segment to send as context.
const PROMPT_CHARS = 200;
// When the provider doesn't say how long to wait.
const DEFAULT_RETRY_AFTER_SECONDS = 5;

type RecordingServiceDeps = {
  noteService: NoteService;
  transcriptService: TranscriptService;
  blob: BlobStore;
  speechToText: SpeechToText;
};

type AudioFile = { buffer: Buffer; mimetype: string };

// Part 1: turns one recorded chunk into one transcript segment.
export function createRecordingService({
  noteService,
  transcriptService,
  blob,
  speechToText,
}: RecordingServiceDeps) {
  return {
    async uploadChunk(
      userId: string,
      noteId: string,
      input: UploadChunkInput,
      audio: AudioFile,
    ): Promise<PublicTranscriptSegment> {
      const note = await noteService.getOwnedNote(userId, noteId);

      if (note.status !== 'recording') {
        const saved = await transcriptService.getSegment(note.id, input.seq);
        if (saved) return saved;
      }

      assertAcceptsChunk(note, input.seq);

      // Saved before transcribing, so the audio is kept even if that fails.
      const audioKey = note.keepAudio
        ? chunkKey(note.id, input.seq, audio.mimetype)
        : null;
      if (audioKey) await blob.put(audioKey, audio.buffer);

      const previous = await transcriptService.previousText(note.id, input.seq);
      const result = await transcribe(speechToText, {
        audio: audio.buffer,
        mimeType: audio.mimetype,
        prompt: previous?.slice(-PROMPT_CHARS),
      });

      // A chunk that can't be transcribed is still saved, flagged, so the
      // transcript shows a gap, its kept audio stays linked, and the note
      // can still become ready.
      const segment = await transcriptService.saveSegment({
        noteId: note.id,
        seq: input.seq,
        startMs: input.startMs,
        endMs: input.startMs + input.durationMs,
        rawText: result.failed ? '' : result.text,
        transcriptionFailed: result.failed,
        audioKey,
      });
      await transcriptService.markReadyIfComplete(note);
      return segment;
    },
  };
}

export type RecordingService = ReturnType<typeof createRecordingService>;

// While recording, any chunk is welcome. After stop, only the ones still in
// flight (seq below the count sent on stop).
function assertAcceptsChunk(note: Note, seq: number) {
  const inFlight =
    note.status === 'processing' &&
    note.totalChunks !== null &&
    seq < note.totalChunks;
  if (note.status === 'recording' || inFlight) return;
  throw new HttpError(
    409,
    'NOTE_NOT_ACCEPTING_CHUNKS',
    'This note is no longer accepting audio',
  );
}

type TranscribeResult = { failed: false; text: string } | { failed: true };

// A temporary provider failure becomes a 503 ("keep the chunk and retry
// later"). A permanent one (the audio itself was rejected) comes back as
// { failed: true }, since retrying the same audio won't help.
async function transcribe(
  speechToText: SpeechToText,
  input: Parameters<SpeechToText['transcribe']>[0],
): Promise<TranscribeResult> {
  try {
    const { text } = await speechToText.transcribe(input);
    return { failed: false, text };
  } catch (error) {
    if (!(error instanceof SpeechToTextError)) throw error;
    // The client only sees a generic message; keep the provider's for us.
    logger.warn({ err: error }, 'speech-to-text failed');
    if (error.retryable) {
      const seconds = error.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS;
      throw new HttpError(
        503,
        'TRANSCRIPTION_FAILED',
        'Transcription is unavailable right now; try again shortly',
        undefined,
        { 'Retry-After': String(seconds) },
      );
    }
    return { failed: true };
  }
}
