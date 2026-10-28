import { Loader2, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteNote } from '@/hooks/note/useDeleteNote';

type DeleteNoteDialogProps = {
  noteId: string;
  title: string;
  // Still recording: the copy says the recording stops too.
  recording?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
};

export function DeleteNoteDialog({
  noteId,
  title,
  recording = false,
  open,
  onOpenChange,
  onDeleted,
}: DeleteNoteDialogProps) {
  const deleteNote = useDeleteNote(noteId, title);
  const pending = deleteNote.isPending;

  return (
    <AlertDialog
      open={open}
      // Stays open while deleting, so the result can't be missed.
      onOpenChange={(next) => !pending && onOpenChange(next)}
    >
      <AlertDialogContent className="gap-6 rounded-3xl p-7 data-[size=default]:sm:max-w-[460px]">
        <AlertDialogHeader className="gap-3">
          <AlertDialogMedia className="size-11 rounded-full bg-destructive/10 text-destructive">
            <Trash2 className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle className="font-display text-display-sm font-light text-ink">
            {recording
              ? 'Stop and delete this recording?'
              : 'Delete this note?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-body-sm">
            {recording
              ? 'Recording stops now and nothing from this session is kept. This can’t be undone.'
              : `“${title}” will be permanently deleted, along with its transcript. This can’t be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mx-0 mb-0 border-0 bg-transparent p-0">
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              // Radix closes on click; close only once the delete has landed.
              event.preventDefault();
              deleteNote.mutate(undefined, {
                onSuccess: () => {
                  onOpenChange(false);
                  onDeleted?.();
                },
              });
            }}
          >
            {pending && <Loader2 className="animate-spin" />}
            {pending
              ? 'Deleting…'
              : recording
                ? 'Stop and delete'
                : 'Delete note'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
