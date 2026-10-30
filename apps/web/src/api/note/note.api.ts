import axios from 'axios';
import type {
  CreateNoteInput,
  CreateUploadInput,
  CreateUploadResponse,
  NoteResponse,
  NotesResponse,
  StopNoteInput,
  TranscriptResponse,
  UpdateNoteInput,
  UploadChunkInput,
  UploadChunkResponse,
} from '@summarise/contract';

import { deleteData, getData, patchData, postData } from '../requests';

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

export function deleteNote(noteId: string) {
  return deleteData<void>(`/notes/${noteId}`);
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

// Creates an upload note and returns the URL to PUT the file to.
export function createUpload(input: CreateUploadInput) {
  return postData<CreateUploadResponse, CreateUploadInput>(
    '/notes/uploads',
    input,
  );
}

// Sends the file straight to the bucket, not to the service, so it uses
// plain axios: no base URL and no auth cookies. The Content-Type must match
// the one the URL was signed with.
export async function putFile(
  uploadUrl: string,
  file: File,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
) {
  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type },
    signal,
    onUploadProgress: (event) => {
      if (event.total) onProgress(event.loaded / event.total);
    },
  });
}

export function completeUpload(noteId: string) {
  return postData<NoteResponse>(`/notes/${noteId}/upload/complete`);
}
