import type {
  CreateNoteInput,
  NoteResponse,
  NotesResponse,
  StopNoteInput,
  TranscriptResponse,
  UpdateNoteInput,
  UploadChunkInput,
  UploadChunkResponse,
} from '@summarise/contract';

import { getData, patchData, postData } from '../requests';

// One recorded chunk: its audio plus the fields the service validates.
export type ChunkUpload = UploadChunkInput & { audio: Blob };

export function createNote(input: CreateNoteInput = {}) {
  return postData<NoteResponse, CreateNoteInput>('/notes', input);
}

export function listNotes() {
  return getData<NotesResponse>('/notes');
}

export function getNote(noteId: string) {
  return getData<NoteResponse>(`/notes/${noteId}`);
}

export function updateNote(noteId: string, input: UpdateNoteInput) {
  return patchData<NoteResponse, UpdateNoteInput>(`/notes/${noteId}`, input);
}

export function stopNote(noteId: string, input: StopNoteInput) {
  return postData<NoteResponse, StopNoteInput>(`/notes/${noteId}/stop`, input);
}

// Sent as multipart; axios sets the boundary header from the FormData.
// The blob's type (e.g. audio/webm) becomes the file's MIME type.
export function uploadChunk(noteId: string, chunk: ChunkUpload) {
  const form = new FormData();
  form.append('seq', String(chunk.seq));
  form.append('startMs', String(chunk.startMs));
  form.append('durationMs', String(chunk.durationMs));
  form.append('audio', chunk.audio, `chunk-${chunk.seq}`);
  return postData<UploadChunkResponse, FormData>(
    `/notes/${noteId}/chunks`,
    form,
  );
}

export function getTranscript(noteId: string) {
  return getData<TranscriptResponse>(`/notes/${noteId}/transcript`);
}
