import { NOTE_TITLE_MAX } from '@summarise/contract';

// "Lecture 4 - Graphs.mp3" → "Lecture 4 - Graphs".
export function titleFromFileName(fileName: string) {
  const title = fileName.replace(/\.[^.]*$/, '').trim();
  return title.slice(0, NOTE_TITLE_MAX) || 'Untitled note';
}
