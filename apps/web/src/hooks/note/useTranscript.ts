import { useQuery } from '@tanstack/react-query';

import { getTranscript } from '@/api/note/note.api';

import { noteKey } from './useNote';

const POLL_MS = 5_000;

// Polls while the note is still being transcribed; stops once it is ready.
export function useTranscript(noteId: string) {
  return useQuery({
    queryKey: [...noteKey(noteId), 'transcript'],
    queryFn: () => getTranscript(noteId),
    refetchInterval: (query) =>
      query.state.data?.status === 'ready' ? false : POLL_MS,
  });
}
