import { useQuery } from '@tanstack/react-query';

import { listNotes } from '@/api/note/note.api';

export const NOTES_KEY = ['notes'] as const;

const POLL_MS = 5_000;

// The signed-in user's notes, newest first. Fetched again each time Home
// opens, so a note stopped a moment ago shows up on the way back, and polled
// while any note is still uploading or being transcribed.
export function useNotes() {
  return useQuery({
    queryKey: NOTES_KEY,
    queryFn: async () => (await listNotes()).notes,
    refetchInterval: (query) =>
      query.state.data?.some(
        (note) => note.status === 'uploading' || note.status === 'processing',
      )
        ? POLL_MS
        : false,
  });
}
