import { audioFileExtension } from '@summarise/speech-to-text';

// Where a chunk's audio lives in blob storage, e.g.
// notes/9a…/chunks/00002.webm. Deterministic, so a retried upload overwrites
// the same file.
export function chunkKey(noteId: string, seq: number, mimeType: string) {
  const extension = audioFileExtension(mimeType) ?? 'bin';
  return `notes/${noteId}/chunks/${String(seq).padStart(5, '0')}.${extension}`;
}
