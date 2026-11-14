import type { PublicNote } from '@summarise/contract';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { LoadingDots } from '@/components/common/LoadingDots';
import { DeleteNoteDialog } from '@/components/note/DeleteNoteDialog';
import { Button } from '@/components/ui/button';
import { useTranscript } from '@/hooks/note/useTranscript';
import { useUploadControls } from '@/hooks/upload/useUploadControls';
import { formatTimestamp } from '@/lib/time.utils';
import {
  percent,
  progressLabel,
  transcriptionProgress,
} from '@/lib/upload/progress.utils';
import { cn } from '@/lib/utils';

// An upload gets a card while this tab is sending its file, or while it is
// being transcribed, paused or failed. Cut off mid-send, it stays a plain
// row in the list ("Upload interrupted").
export function hasUploadCard(note: PublicNote, sending: boolean) {
  if (note.source !== 'upload') return false;
  if (note.status === 'uploading') return sending;
  return (
    note.status === 'processing' ||
    note.status === 'paused' ||
    note.status === 'failed'
  );
}

// An upload in progress on Home, as a plain card: where it is
// (sending, transcribing, paused, failed), how far it has got, and the same
// controls as the pill on its note. Buttons that don't apply yet stay in
// place, disabled, so nothing moves under the pointer when the state
// changes on its own.
export function UploadCard({
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

  return (
    <div className="rounded-2xl border border-hairline bg-surface-card p-6 shadow-soft sm:px-8 sm:py-7">
      <div>
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className={cn(
              'mt-3 size-2.5 shrink-0 rounded-full',
              note.status === 'failed' && 'bg-destructive',
              note.status === 'paused' && 'border-2 border-muted-soft',
              (sending || note.status === 'processing') &&
                'animate-pulse bg-muted-foreground motion-reduce:animate-none',
            )}
          />
          <div className="min-w-0 flex-1">
            <Link
              to={`/notes/${note.id}`}
              className="block truncate font-display text-display-sm text-ink decoration-1 underline-offset-4 hover:underline"
            >
              {note.title}
            </Link>
            <StatusLine
              status={note.status}
              sendProgress={sendProgress ?? 0}
              label={progressLabel(progress)}
              started={progress.doneMs > 0}
              doneMs={progress.doneMs}
            />
          </div>
          <Link
            to={`/notes/${note.id}`}
            className="group mt-1.5 hidden shrink-0 items-center gap-1 text-button text-ink sm:inline-flex"
          >
            Open
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div
          className="mt-5 h-0.5 overflow-hidden rounded-full bg-hairline"
          role="progressbar"
          aria-label={sending ? 'Sent' : 'Transcribed'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={
            fraction === null ? undefined : Math.floor(fraction * 100)
          }
        >
          <div
            className="h-full rounded-full bg-ink transition-[width] duration-500"
            style={{ width: `${(fraction ?? 0) * 100}%` }}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {note.status === 'processing' || sending ? (
            <Button
              variant="outline"
              className="w-[6.5rem]"
              // A file that is still sending can't be paused yet.
              disabled={busy || sending}
              onClick={() => controls.mutate('pause')}
            >
              Pause
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-[6.5rem]"
              disabled={busy}
              onClick={() => controls.mutate('resume')}
            >
              {note.status === 'failed' ? 'Retry' : 'Resume'}
            </Button>
          )}
          <Button
            variant="outline"
            // Nothing to keep until a piece is transcribed.
            disabled={busy || sending || progress.doneMs === 0}
            onClick={() => controls.mutate('stop')}
          >
            Stop
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setCancelling(true)}
          >
            Cancel
          </Button>
        </div>
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

function StatusLine({
  status,
  sendProgress,
  label,
  started,
  doneMs,
}: {
  status: PublicNote['status'];
  sendProgress: number;
  label: string;
  started: boolean;
  doneMs: number;
}) {
  const className = 'mt-1 text-caption text-muted-foreground';
  if (status === 'uploading') {
    return (
      <p className={className}>
        Sending your file · {percent(sendProgress)} · keep this tab open
      </p>
    );
  }
  if (status === 'paused') return <p className={className}>Paused · {label}</p>;
  if (status === 'failed') {
    return (
      <p className={className}>
        Transcription failed at {formatTimestamp(doneMs)}
      </p>
    );
  }
  return (
    <LoadingDots
      label={started ? `Transcribing · ${label}` : 'Starting transcription…'}
      className={cn(className, 'flex')}
    />
  );
}
