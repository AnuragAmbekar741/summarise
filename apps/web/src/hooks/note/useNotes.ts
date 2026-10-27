import { useQuery } from '@tanstack/react-query';

import { listNotes } from '@/api/note/note.api';

export const NOTES_KEY = ['notes'] as const;

// The signed-in user's notes, newest first. Fetched again each time Home
// opens, so a note stopped a moment ago shows up on the way back.
export function useNotes() {
  return useQuery({
    queryKey: NOTES_KEY,
    queryFn: async () => (await listNotes()).notes,
  });
}
