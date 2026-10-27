import type { PublicNote } from '@summarise/contract';
import { Link } from 'react-router-dom';

import { LoadingDots } from '@/components/common/LoadingDots';
import { formatDay, formatDuration, formatTime } from '@/lib/time.utils';
import { cn } from '@/lib/utils';

// Spec: docs/design/components/note-list.md
type NoteListProps = {
  // Newest first, as the service returns them.
  notes: PublicNote[];
  className?: string;
};

export function NoteList({ notes, className }: NoteListProps) {
  return (
    <div className={cn('space-y-12', className)}>
      {groupByDay(notes).map(({ day, notes: dayNotes }) => (
        <section key={day}>
          <h2 className="font-sans text-caption-upper text-muted-foreground uppercase">
            {day}
          </h2>
          <ul className="mt-4 space-y-2">
            {dayNotes.map((note) => (
              <li key={note.id}>
                <NoteRow note={note} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function NoteRow({ note }: { note: PublicNote }) {
  const meta =
    note.durationMs === null
      ? formatTime(note.startedAt)
      : `${formatTime(note.startedAt)} · ${formatDuration(note.durationMs)}`;

  return (
    <Link
      to={`/notes/${note.id}`}
      className="group flex items-baseline justify-between gap-6 py-2"
    >
      <div className="min-w-0">
        <p className="truncate font-display text-display-sm text-ink decoration-1 underline-offset-4 group-hover:underline">
          {note.title}
        </p>
        {note.status === 'processing' && (
          <LoadingDots
            label="Finishing transcript…"
            className="mt-2 text-caption"
          />
        )}
        {note.status === 'recording' && (
          <p className="mt-2 text-caption text-muted-foreground">Recording</p>
        )}
      </div>
      <span className="shrink-0 text-caption text-muted-foreground">
        {meta}
      </span>
    </Link>
  );
}

// Consecutive notes from the same local day share a heading. The input is
// newest first, so the days come out newest first too.
function groupByDay(notes: PublicNote[]) {
  const groups: { day: string; notes: PublicNote[] }[] = [];
  for (const note of notes) {
    const day = formatDay(note.startedAt);
    const last = groups.at(-1);
    if (last?.day === day) last.notes.push(note);
    else groups.push({ day, notes: [note] });
  }
  return groups;
}
