import { NOTE_TITLE_MAX } from '@summarise/contract';

// Where an uploaded file lives in the bucket until it has been transcribed.
export function uploadKey(noteId: string) {
  return `uploads/${noteId}/source`;
}

// "Lecture 4 - Graphs.mp3" → "Lecture 4 - Graphs".
export function titleFromFileName(fileName: string) {
  const title = fileName.replace(/\.[^.]*$/, '').trim();
  return title.slice(0, NOTE_TITLE_MAX) || 'Untitled note';
}
