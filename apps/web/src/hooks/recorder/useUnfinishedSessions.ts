import { useLiveQuery } from 'dexie-react-hooks';

import { recordingDb } from '@/lib/recording/recording.store';

// Recordings in this browser that haven't been stopped yet: recording now,
// paused, or cut off by a closed tab.
export function useUnfinishedSessions() {
  return useLiveQuery(
    () =>
      recordingDb.sessions
        .filter((session) => session.pendingStop === undefined)
        .toArray(),
    [],
    [],
  );
}
