import { useLiveQuery } from 'dexie-react-hooks';

import { recordingDb } from '@/lib/recording/recording.store';

// How many of the note's chunks are still waiting to upload.
export function usePendingChunks(noteId: string) {
  return useLiveQuery(
    () => recordingDb.chunks.where('noteId').equals(noteId).count(),
    [noteId],
    0,
  );
}
