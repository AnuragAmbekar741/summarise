import { useLiveQuery } from 'dexie-react-hooks';

import { recordingDb } from '@/lib/recording/recording.store';

// This browser's recording session for the note, kept up to date live.
// undefined while loading, null when this browser has none.
export function useLocalSession(noteId: string) {
  return useLiveQuery(
    async () => (await recordingDb.sessions.get(noteId)) ?? null,
    [noteId],
  );
}
