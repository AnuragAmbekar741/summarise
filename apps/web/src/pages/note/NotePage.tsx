import type { NoteStatus } from '@summarise/contract';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { getApiError } from '@/api/error.utils';
import { EditableText } from '@/components/common/EditableText';
import { NotesPane } from '@/components/note/NotesPane';
import { RecordingPill } from '@/components/note/RecordingPill';
import { StatusChip } from '@/components/note/StatusChip';
import {
  TranscriptPane,
  type TranscriptMode,
} from '@/components/note/TranscriptPane';
import { useNote } from '@/hooks/note/useNote';
import { useTranscript } from '@/hooks/note/useTranscript';
import { useUpdateNote } from '@/hooks/note/useUpdateNote';
import { useElapsedMs } from '@/hooks/recorder/useElapsedMs';
import { useLocalSession } from '@/hooks/recorder/useLocalSession';
import { usePendingChunks } from '@/hooks/recorder/usePendingChunks';
import { useRecorder } from '@/hooks/recorder/useRecorder';
import type { RecorderState } from '@/lib/recording/chunk.recorder';
import { recorderErrorMessage } from '@/lib/recording/recorder.utils';
import type { LocalSession } from '@/lib/recording/recording.store';
import { formatDuration, formatNoteDate } from '@/lib/time.utils';

// Spec: docs/design/pages/note.md
// Keyed by the note, so each note gets fresh page state (e.g. stopClicked
// never carries over to another note).
export function NotePage() {
  const { noteId = '' } = useParams();
  return <NoteView key={noteId} noteId={noteId} />;
}

function NoteView({ noteId }: { noteId: string }) {
  const note = useNote(noteId);
  const transcript = useTranscript(noteId);
  const updateNote = useUpdateNote(noteId);
  const session = useLocalSession(noteId);
  const pendingChunks = usePendingChunks(noteId);
  const recorder = useRecorder();
  const elapsedMs = useElapsedMs();
  // Between clicking Stop and the service hearing about it.
  const [stopClicked, setStopClicked] = useState(false);

  if (note.isError) {
    return getApiError(note.error)?.code === 'NOT_FOUND' ? (
      <Message text="This note doesn't exist." />
    ) : (
      <Message text="Couldn't load this note. Please try again." />
    );
  }
  // Render nothing until we know, so the page doesn't flash.
  if (!note.data || session === undefined) return null;

  const isActive = recorder.noteId === noteId;
  const mode = modeFor({
    status: note.data.status,
    recorderState: isActive ? recorder.state : undefined,
    session,
    stopClicked,
  });

  async function run(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      toast.error(recorderErrorMessage(error));
    }
  }

  const segments = transcript.data?.segments ?? [];
  const { title, description, startedAt, durationMs } = note.data;
  const subtitle =
    mode === 'ready' && durationMs !== null
      ? `${formatNoteDate(startedAt)} · ${formatDuration(durationMs)}`
      : formatNoteDate(startedAt);

  return (
    <div className="flex min-h-svh flex-col bg-canvas lg:h-svh">
      <header className="flex flex-wrap items-start justify-between gap-4 px-4 py-5 sm:px-8">
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-4">
          <Link
            to="/"
            aria-label="Back to notes"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-strong"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <EditableText
              as="h1"
              label="Title"
              value={title}
              required
              showPencil
              onSave={(next) => updateNote.mutate({ title: next })}
              className="text-display-sm sm:text-display-md"
            />
            <EditableText
              label="Description"
              value={description ?? ''}
              placeholder="Add a description"
              multiline
              onSave={(next) =>
                updateNote.mutate({ description: next || null })
              }
              className="mt-2 max-w-[640px] text-body-md text-body"
            />
            <p className="mt-1 text-caption text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>

        {(mode === 'recording' ||
          mode === 'paused' ||
          mode === 'finishing') && (
          <RecordingPill
            mode={mode}
            elapsedMs={isActive ? elapsedMs : (session?.elapsedMs ?? 0)}
            onPause={() => void run(recorder.pause)}
            onResume={() => void run(() => recorder.resume(noteId))}
            onStop={() => {
              setStopClicked(true);
              void run(() => recorder.stop(noteId));
            }}
          />
        )}
        {(mode === 'ready' || mode === 'elsewhere') && (
          <StatusChip status={mode} />
        )}
      </header>

      <main className="grid flex-1 lg:min-h-0 lg:grid-cols-2">
        <TranscriptPane
          segments={segments}
          mode={mode}
          durationMs={durationMs}
          pendingChunks={pendingChunks}
          // Fewer lines than chunks recorded here: some are still on the way.
          transcribing={session !== null && segments.length < session.nextSeq}
          className="lg:overflow-y-auto lg:border-r lg:border-hairline"
        />
        <NotesPane
          canBuild={mode === 'ready'}
          className="border-t border-hairline lg:overflow-y-auto lg:border-t-0"
        />
      </main>
    </div>
  );
}

// What the page shows, from the service's status and this browser's state.
function modeFor({
  status,
  recorderState,
  session,
  stopClicked,
}: {
  status: NoteStatus;
  // This tab's recorder, when it is recording this note.
  recorderState: RecorderState | undefined;
  session: LocalSession | null;
  stopClicked: boolean;
}): TranscriptMode {
  if (status === 'ready') return 'ready';
  if (status === 'processing') return 'finishing';
  if (recorderState === 'recording') return 'recording';
  if (recorderState === 'paused') return 'paused';
  if (stopClicked || recorderState === 'stopped' || session?.pendingStop) {
    return 'finishing';
  }
  // Cut off by a reload or a closed tab: carry on with Resume.
  if (session) return 'paused';
  return 'elsewhere';
}

function Message({ text }: { text: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-canvas px-4 text-center">
      <p className="text-body-md text-body">{text}</p>
      <Link
        to="/"
        className="text-button text-ink underline-offset-4 hover:underline"
      >
        Back to notes
      </Link>
    </div>
  );
}
