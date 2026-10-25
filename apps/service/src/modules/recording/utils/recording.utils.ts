// Audio types the upload accepts, and the file extension each is stored
// under. Owned here, not by the speech-to-text provider, so switching
// providers can't silently change what the API accepts.
const AUDIO_EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
};

// "audio/webm;codecs=opus" → "webm". Undefined for types we don't accept.
export function audioExtension(mimeType: string): string | undefined {
  const base = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  return AUDIO_EXTENSIONS[base];
}

// Where a chunk's audio lives in blob storage, e.g.
// notes/9a…/chunks/00002.webm. Deterministic, so a retried upload overwrites
// the same file.
export function chunkKey(noteId: string, seq: number, mimeType: string) {
  const extension = audioExtension(mimeType) ?? 'bin';
  return `notes/${noteId}/chunks/${String(seq).padStart(5, '0')}.${extension}`;
}
