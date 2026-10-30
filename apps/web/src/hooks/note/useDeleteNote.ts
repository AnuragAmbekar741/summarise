import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/api/error.utils';
import { deleteNote } from '@/api/note/note.api';
import { useRecorder } from '@/hooks/recorder/useRecorder';
import { useUploads } from '@/hooks/upload/useUploads';

import { NOTES_KEY } from './useNotes';

// Deletes a note for good. A recording or upload of it in this browser is
// stopped first, so nothing more is sent for it.
export function useDeleteNote(noteId: string, title: string) {
  const queryClient = useQueryClient();
  const recorder = useRecorder();
  const uploads = useUploads();

  return useMutation({
    mutationFn: async () => {
      await recorder.discard(noteId);
      uploads.cancel(noteId);
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
