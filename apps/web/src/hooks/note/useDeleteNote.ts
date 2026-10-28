import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/api/error.utils';
import { deleteNote } from '@/api/note/note.api';
import { useRecorder } from '@/hooks/recorder/useRecorder';

import { NOTES_KEY } from './useNotes';

// Deletes a note for good. A recording of it in this browser is stopped and
// dropped first, so nothing more is sent for it.
export function useDeleteNote(noteId: string, title: string) {
  const queryClient = useQueryClient();
  const recorder = useRecorder();

  return useMutation({
    mutationFn: async () => {
      await recorder.discard(noteId);
      await deleteNote(noteId);
    },
    onSuccess: async () => {
      // Not removed from the cache here: an open note page would fetch it
      // again and show "doesn't exist" before it navigates away.
      await queryClient.invalidateQueries({ queryKey: NOTES_KEY });
      toast.success(`“${title}” deleted`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
