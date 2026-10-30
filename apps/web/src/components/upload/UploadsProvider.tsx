import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { getErrorMessage } from '@/api/error.utils';
import {
  completeUpload,
  createUpload,
  deleteNote,
  putFile,
} from '@/api/note/note.api';
import { noteKey } from '@/hooks/note/useNote';
import { NOTES_KEY } from '@/hooks/note/useNotes';

import { UploadsContext } from './upload.context';

// Holds this tab's uploads above the routes, so they keep going (and keep
// their progress) while the user moves between pages.
export function UploadsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<Record<string, number>>({});
  // One per upload in flight, to cancel it.
  const controllers = useRef(new Map<string, AbortController>());

  function setNoteProgress(noteId: string, fraction: number | null) {
    setProgress((current) => {
      const next = { ...current };
      if (fraction === null) delete next[noteId];
      else next[noteId] = fraction;
      return next;
    });
  }

  // The list, and the note's own page if it's open.
  const refreshNotes = (noteId?: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: NOTES_KEY }),
      noteId && queryClient.invalidateQueries({ queryKey: noteKey(noteId) }),
    ]);

  async function start(file: File) {
    let noteId: string | undefined;
    try {
      const { note, uploadUrl } = await createUpload({
        fileName: file.name,
        contentType: file.type,
        size: file.size,
      });
      noteId = note.id;
      const controller = new AbortController();
      controllers.current.set(note.id, controller);
      // Progress first, so the list never shows the new note as interrupted.
      setNoteProgress(note.id, 0);
      void refreshNotes();

      await putFile(
        uploadUrl,
        file,
        (fraction) => setNoteProgress(note.id, fraction),
        controller.signal,
      );
      await completeUpload(note.id);
    } catch (error) {
      // Cancelled because the note is being deleted: nothing to report.
      if (noteId && controllers.current.get(noteId)?.signal.aborted) return;
      toast.error(`Couldn’t upload “${file.name}”. ${getErrorMessage(error)}`);
      // A note whose file never arrived is no use; drop it.
      if (noteId) await deleteNote(noteId).catch(() => undefined);
    } finally {
      if (noteId) controllers.current.delete(noteId);
      // Refetch first: dropping the progress while the list still says
      // uploading would flash "Upload interrupted".
      await refreshNotes(noteId);
      if (noteId) setNoteProgress(noteId, null);
    }
  }

  function cancel(noteId: string) {
    controllers.current.get(noteId)?.abort();
  }

  return (
    <UploadsContext.Provider value={{ progress, start, cancel }}>
      {children}
    </UploadsContext.Provider>
  );
}
