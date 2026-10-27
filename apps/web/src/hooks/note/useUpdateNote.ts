import type { PublicNote, UpdateNoteInput } from '@summarise/contract';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/api/error.utils';
import { updateNote } from '@/api/note/note.api';

import { noteKey } from './useNote';
import { NOTES_KEY } from './useNotes';

// Saves a new title or description. The page shows the change at once and
// puts the old value back if the save fails.
export function useUpdateNote(noteId: string) {
  const queryClient = useQueryClient();
  const key = noteKey(noteId);

  return useMutation({
    mutationFn: async (input: UpdateNoteInput) =>
      (await updateNote(noteId, input)).note,
    onMutate: async (input) => {
      // A poll landing mid-save would overwrite the new value with the old.
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      const previous = queryClient.getQueryData<PublicNote>(key);
      if (previous) queryClient.setQueryData(key, { ...previous, ...input });
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(getErrorMessage(error));
    },
    onSuccess: (note) => queryClient.setQueryData(key, note),
    // Home's list shows the title too.
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTES_KEY }),
  });
}
