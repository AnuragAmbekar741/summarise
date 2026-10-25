import { useQuery } from '@tanstack/react-query';

import { getApiError } from '@/api/error.utils';
import { getNote } from '@/api/note/note.api';

export const noteKey = (noteId: string) => ['note', noteId] as const;

const POLL_MS = 5_000;

// Polls until the note is ready, so the page sees Stop land and the last
// chunks arrive.
export function useNote(noteId: string) {
  return useQuery({
    queryKey: noteKey(noteId),
    queryFn: async () => (await getNote(noteId)).note,
    refetchInterval: (query) =>
      query.state.data?.status === 'ready' ? false : POLL_MS,
    // A missing note won't appear by asking again.
    retry: (failures, error) =>
      getApiError(error)?.code !== 'NOT_FOUND' && failures < 3,
  });
}
