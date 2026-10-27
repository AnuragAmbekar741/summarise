import { CircleDot } from 'lucide-react';

import { AccountMenu } from '@/components/common/AccountMenu';
import { GradientOrb } from '@/components/common/GradientOrb';
import { Logo } from '@/components/common/Logo';
import { LiveNoteCard } from '@/components/note/LiveNoteCard';
import { NoteList } from '@/components/note/NoteList';
import { Button } from '@/components/ui/button';
import { useNotes } from '@/hooks/note/useNotes';
import { useStartNote } from '@/hooks/note/useStartNote';
import { useRecorder } from '@/hooks/recorder/useRecorder';
import { useUnfinishedSessions } from '@/hooks/recorder/useUnfinishedSessions';

// Spec: docs/design/pages/home.md
export function HomePage() {
  const startNote = useStartNote();
  const recorder = useRecorder();
  const sessions = useUnfinishedSessions();
  const notes = useNotes();

  // A note still recording from this browser already has its live card.
  const liveIds = new Set(sessions.map((session) => session.noteId));
  const listed = (notes.data ?? []).filter(
    (note) => !(liveIds.has(note.id) && note.status === 'recording'),
  );

  return (
    <div className="relative min-h-svh overflow-hidden bg-canvas">
      <GradientOrb color="sky" className="-top-72 right-[18%] size-[720px]" />
      <GradientOrb color="peach" className="-top-64 -right-64 size-[720px]" />

      <header className="relative z-10 flex h-16 items-center justify-between px-4 sm:h-20 sm:px-12">
        <Logo />
        <AccountMenu />
      </header>

      <main className="relative z-10 mx-auto max-w-[1064px] px-4 pt-12 pb-section sm:px-12 sm:pt-14">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <h1 className="text-display-xl sm:text-display-mega">Notes</h1>
          <Button
            size="lg"
            // One recording at a time per tab.
            disabled={startNote.isPending || recorder.noteId !== null}
            onClick={() => startNote.mutate()}
          >
            <CircleDot className="text-destructive" />
            {startNote.isPending ? 'Starting…' : 'Start notetaker'}
          </Button>
        </div>

        {sessions.length > 0 && (
          <div className="mt-12 space-y-4">
            {sessions.map((session) => (
              <LiveNoteCard key={session.noteId} session={session} />
            ))}
          </div>
        )}

        {notes.isError && (
          <p className="mt-12 text-body-md text-muted-foreground">
            Couldn't load your notes.
          </p>
        )}
        {notes.data &&
          (listed.length > 0 ? (
            <NoteList notes={listed} className="mt-12" />
          ) : (
            sessions.length === 0 && (
              <p className="mt-12 text-body-md text-muted-foreground">
                No notes yet. Start the notetaker in your next lecture.
              </p>
            )
          ))}
      </main>
    </div>
  );
}
