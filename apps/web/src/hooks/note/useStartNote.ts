import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { getErrorMessage } from '@/api/error.utils';
import { createNote } from '@/api/note/note.api';
import { useRecorder } from '@/hooks/recorder/useRecorder';
import { recorderErrorMessage } from '@/lib/recording/recorder.utils';

// "Start notetaker": creates the note, turns the mic on, opens the note.
export function useStartNote() {
  const recorder = useRecorder();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      const { note } = await createNote();
      try {
        await recorder.start(note.id);
      } catch (error) {
        // The note exists and shows as paused, so the user can retry Resume.
        toast.error(recorderErrorMessage(error));
      }
      return note;
    },
    onSuccess: (note) => navigate(`/notes/${note.id}`),
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
