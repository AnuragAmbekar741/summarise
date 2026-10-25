import { CircleDot } from 'lucide-react';

import { AccountMenu } from '@/components/common/AccountMenu';
import { GradientOrb } from '@/components/common/GradientOrb';
import { Logo } from '@/components/common/Logo';
import { LiveNoteCard } from '@/components/note/LiveNoteCard';
import { Button } from '@/components/ui/button';
import { useStartNote } from '@/hooks/note/useStartNote';
import { useRecorder } from '@/hooks/recorder/useRecorder';
import { useUnfinishedSessions } from '@/hooks/recorder/useUnfinishedSessions';

// Spec: docs/design/pages/home.md
export function HomePage() {
  const startNote = useStartNote();
  const recorder = useRecorder();
  const sessions = useUnfinishedSessions();

  return (
    <div className="relative min-h-svh overflow-hidden bg-canvas">
      <GradientOrb color="sky" className="-top-72 right-[18%] size-[720px]" />
      <GradientOrb color="peach" className="-top-64 -right-64 size-[720px]" />

      <header className="relative z-10 flex h-16 items-center justify-between border-b border-hairline px-4 sm:h-20 sm:px-12">
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
      </main>
    </div>
  );
}
