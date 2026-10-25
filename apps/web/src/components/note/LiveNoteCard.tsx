import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { GradientOrb } from '@/components/common/GradientOrb';
import { useNote } from '@/hooks/note/useNote';
import { useElapsedMs } from '@/hooks/recorder/useElapsedMs';
import { useRecorder } from '@/hooks/recorder/useRecorder';
import type { LocalSession } from '@/lib/recording/recording.store';
import { formatClock } from '@/lib/time.utils';
import { cn } from '@/lib/utils';

// Spec: docs/design/components/live-note-card.md
export function LiveNoteCard({ session }: { session: LocalSession }) {
  const { noteId } = session;
  const note = useNote(noteId);
  const recorder = useRecorder();
  const elapsedMs = useElapsedMs();

  // Gone or finished on the service: nothing left to come back to.
  if (!note.data || note.data.status !== 'recording') return null;

  const isActive = recorder.noteId === noteId;
  const recording = isActive && recorder.state === 'recording';

  return (
    <Link
      to={`/notes/${noteId}`}
      className="group relative block overflow-hidden rounded-2xl border border-hairline bg-surface-card p-6 shadow-soft transition-colors hover:border-hairline-strong sm:px-8 sm:py-7"
    >
      <GradientOrb
        color="lavender"
        className="-top-40 left-[35%] size-[360px]"
      />
      <GradientOrb color="mint" className="-top-48 -right-24 size-[420px]" />

      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-3">
        <span
          aria-hidden
          className={cn(
            'size-2.5 shrink-0 rounded-full',
            recording
              ? 'animate-pulse bg-destructive motion-reduce:animate-none'
              : 'border-2 border-muted-soft',
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-display-sm text-ink">
            {note.data.title}
          </p>
          <p className="mt-1 text-caption text-muted-foreground">
            {recording ? 'Taking notes now' : 'Paused'}
          </p>
        </div>
        <span className="font-mono text-body-md font-medium text-ink tabular-nums">
          {formatClock(isActive ? elapsedMs : session.elapsedMs)}
        </span>
        <span className="inline-flex items-center gap-1 text-button text-ink">
          Open
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
