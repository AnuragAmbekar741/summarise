import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { getErrorMessage } from '@/api/error.utils';
import {
  completeUpload,
  createUpload,
  deleteNote,
  putFile,
} from '@/api/note/note.api';
import { NOTES_KEY } from '@/hooks/note/useNotes';

import { UploadsContext } from './upload.context';

// Holds this tab's uploads above the routes, so they keep going (and keep
// their progress) while the user moves between pages.
export function UploadsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<Record<string, number>>({});

  function setNoteProgress(noteId: string, fraction: number | null) {
    setProgress((current) => {
      const next = { ...current };
      if (fraction === null) delete next[noteId];
      else next[noteId] = fraction;
      return next;
    });
  }

  const refreshNotes = () =>
    queryClient.invalidateQueries({ queryKey: NOTES_KEY });

  async function start(file: File) {
    let noteId: string | undefined;
    try {
      const { note, uploadUrl } = await createUpload({
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      });
      noteId = note.id;
      // Progress first, so the list never shows the new note as interrupted.
      setNoteProgress(note.id, 0);
      void refreshNotes();

      await putFile(uploadUrl, file, (fraction) =>
        setNoteProgress(note.id, fraction),
      );
      await completeUpload(note.id);
    } catch (error) {
      toast.error(`Couldn’t upload “${file.name}”. ${getErrorMessage(error)}`);
      // A note whose file never arrived is no use; drop it.
      if (noteId) await deleteNote(noteId).catch(() => undefined);
    } finally {
      // Refetch first: dropping the progress while the list still says
      // uploading would flash "Upload interrupted".
      await refreshNotes();
      if (noteId) setNoteProgress(noteId, null);
    }
  }

  return (
    <UploadsContext.Provider value={{ progress, start }}>
      {children}
    </UploadsContext.Provider>
  );
}
