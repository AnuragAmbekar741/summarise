import type { PublicNote } from '@summarise/contract';
import { Pause, Play, RotateCcw, Square, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { LoadingDots } from '@/components/common/LoadingDots';
import { DeleteNoteDialog } from '@/components/note/DeleteNoteDialog';
import { useTranscript } from '@/hooks/note/useTranscript';
import { useUploadControls } from '@/hooks/upload/useUploadControls';
import { percent, transcriptionProgress } from '@/lib/upload/progress.utils';
import { cn } from '@/lib/utils';

// An upload gets a row under "In progress" while this tab is sending its
// file, or while it is being transcribed, paused or failed. Cut off
// mid-send, it stays a plain row in the list ("Upload interrupted").
export function isUploadInProgress(note: PublicNote, sending: boolean) {
  if (note.source !== 'upload') return false;
  if (note.status === 'uploading') return sending;
  return (
    note.status === 'processing' ||
    note.status === 'paused' ||
    note.status === 'failed'
  );
}

// An upload in progress on Home: a note row like the others, with one quiet
// line of status, a thin progress bar, and three small controls. The whole
// row opens the note. The controls keep their places in every state
// (unavailable ones are disabled), so nothing moves under the pointer.
export function UploadRow({
  note,
  // How far (0 to 1) this tab has sent the file, while sending.
  sendProgress,
}: {
  note: PublicNote;
  sendProgress: number | undefined;
}) {
  const transcript = useTranscript(note.id);
  const controls = useUploadControls(note.id);
  const [cancelling, setCancelling] = useState(false);

  const sending = note.status === 'uploading';
  const progress = transcriptionProgress(
    note.durationMs,
    transcript.data?.segments,
  );
  const fraction = sending ? (sendProgress ?? 0) : progress.fraction;
  const busy = controls.isPending;
  const running = sending || note.status === 'processing';

  return (
    // Same row as the note list: lifts to a card surface on hover or focus.
    <div className="group/row relative -mx-3 rounded-xl px-3 transition-colors duration-200 focus-within:bg-surface-card hover:bg-surface-card">
      <Link to={`/notes/${note.id}`} className="group block py-2 pr-32">
        <p className="truncate font-display text-title-md font-light text-ink decoration-1 underline-offset-4 group-hover:underline">
          {note.title}
        </p>
        <div className="mt-2 w-56 max-w-full">
          <Status
            status={note.status}
            sendProgress={sendProgress ?? 0}
            fraction={progress.fraction}
            started={progress.doneMs > 0}
          />
          <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-hairline">
            <div
              className="h-full rounded-full bg-ink transition-[width] duration-500"
              style={{ width: `${(fraction ?? 0) * 100}%` }}
            />
          </div>
        </div>
      </Link>

      <div className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center">
        {running ? (
          <IconButton
            label="Pause"
            // A file that is still sending can't be paused yet.
            disabled={busy || sending}
            onClick={() => controls.mutate('pause')}
          >
            <Pause />
          </IconButton>
        ) : (
          <IconButton
            label={note.status === 'failed' ? 'Retry' : 'Resume'}
            disabled={busy}
            onClick={() => controls.mutate('resume')}
          >
            {note.status === 'failed' ? <RotateCcw /> : <Play />}
          </IconButton>
        )}
        <IconButton
          label="Stop and keep the transcript so far"
          // Nothing to keep until a piece is transcribed.
          disabled={busy || sending || progress.doneMs === 0}
          onClick={() => controls.mutate('stop')}
        >
          <Square />
        </IconButton>
        <IconButton
          label="Cancel and delete"
          disabled={busy}
          onClick={() => setCancelling(true)}
        >
          <X />
        </IconButton>
      </div>

      <DeleteNoteDialog
        noteId={note.id}
        title={note.title}
        open={cancelling}
        onOpenChange={setCancelling}
      />
    </div>
  );
}

function Status({
  status,
  sendProgress,
  fraction,
  started,
}: {
  status: PublicNote['status'];
  sendProgress: number;
  fraction: number | null;
  started: boolean;
}) {
  const className = 'text-caption text-muted-foreground';
  const done = fraction === null ? '' : ` · ${percent(fraction)}`;
  if (status === 'uploading') {
    return (
      <p className={className}>
        Sending · {percent(sendProgress)} · keep this tab open
      </p>
    );
  }
  if (status === 'paused') return <p className={className}>Paused{done}</p>;
  if (status === 'failed') return <p className={className}>Failed{done}</p>;
  return (
    <LoadingDots
      label={started ? `Transcribing${done}` : 'Starting…'}
      className={cn(className, 'flex')}
    />
  );
}

function IconButton({
  label,
  children,
  ...props
}: {
  label: string;
  children: ReactNode;
} & Omit<React.ComponentProps<'button'>, 'children'>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-surface-strong hover:text-ink focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4"
      {...props}
    >
      {children}
    </button>
  );
}
