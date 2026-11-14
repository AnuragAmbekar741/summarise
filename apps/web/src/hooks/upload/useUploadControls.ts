import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { getErrorMessage } from '@/api/error.utils';
import { pauseUpload, resumeUpload, stopUpload } from '@/api/note/note.api';
import { noteKey } from '@/hooks/note/useNote';
import { NOTES_KEY } from '@/hooks/note/useNotes';

const ACTIONS = {
  pause: pauseUpload,
  resume: resumeUpload,
  stop: stopUpload,
};

export type UploadAction = keyof typeof ACTIONS;

// Pauses, resumes (or retries) or stops an uploaded file's transcription.
// The page shows the note's new status as soon as the service answers.
export function useUploadControls(noteId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: UploadAction) =>
      (await ACTIONS[action](noteId)).note,
    onSuccess: (note) => queryClient.setQueryData(noteKey(noteId), note),
    onError: (error) => toast.error(getErrorMessage(error)),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: NOTES_KEY }),
        // The note and its transcript (a stop keeps only the saved pieces).
        queryClient.invalidateQueries({ queryKey: noteKey(noteId) }),
      ]),
  });
}
