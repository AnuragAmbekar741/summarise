import {
  NOTE_TITLE_MAX,
  type NoteStatus,
  type PublicTranscriptSegment,
} from '@summarise/contract';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { getApiError } from '@/api/error.utils';
import { AccountMenu } from '@/components/common/AccountMenu';
import { EditableText } from '@/components/common/EditableText';
import { FloatingWidget } from '@/components/common/FloatingWidget';
import { Logo } from '@/components/common/Logo';
import { PageGradient } from '@/components/common/PageGradient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeleteNoteDialog } from '@/components/note/DeleteNoteDialog';
import { NoteActionsMenu } from '@/components/note/NoteActionsMenu';
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

// Kept to one short line in the header. Only the web app holds it to this;
// the service allows up to NOTE_DESCRIPTION_MAX.
const DESCRIPTION_MAX = 75;

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
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

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
  // "Sun, Oct 25 · 3:36pm · 48 min · 6,210 words · 2 parts uploading"
  const meta = [formatNoteDate(startedAt)];
  if (mode === 'ready') {
    if (durationMs !== null) meta.push(formatDuration(durationMs));
    if (segments.length > 0) meta.push(formatWords(countWords(segments)));
  }
  if (pendingChunks > 0) {
    meta.push(
      `${pendingChunks} ${pendingChunks === 1 ? 'part' : 'parts'} uploading`,
    );
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-canvas">
      <PageGradient />

      <header className="relative z-10 flex h-16 items-center justify-between px-4 sm:h-20 sm:px-12">
        <Logo />
        <AccountMenu />
      </header>

      <main className="relative z-10 mx-auto max-w-[1064px] px-4 pt-4 pb-section sm:px-12 sm:pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-nav-link text-muted-foreground transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden />
          All notes
        </Link>

        <EditableText
          as="h1"
          label="Title"
          value={title}
          required
          maxLength={NOTE_TITLE_MAX}
          onSave={(next) => updateNote.mutate({ title: next })}
          className="mt-4 text-display-sm sm:text-display-lg"
        />
        <EditableText
          label="Description"
          value={description ?? ''}
          placeholder="Add a description"
          multiline
          maxLength={DESCRIPTION_MAX}
          onSave={(next) => updateNote.mutate({ description: next || null })}
          className="mt-4 text-body-md text-body"
        />
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <StatusChip mode={mode} />
          <p className="text-body-sm text-muted-foreground">
            {meta.join(' · ')}
          </p>
        </div>

        <Tabs defaultValue="transcript" className="mt-12">
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              {/* Notes are built from the whole transcript, so not before. */}
              <TabsTrigger value="notes" disabled={mode !== 'ready'}>
                Notes
              </TabsTrigger>
            </TabsList>
            <NoteActionsMenu onDelete={() => setDeleting(true)} />
          </div>
          <TabsContent value="transcript" className="mt-8">
            <TranscriptPane
              segments={segments}
              mode={mode}
              // Fewer lines than chunks recorded here: some are still on the way.
              transcribing={
                session !== null && segments.length < session.nextSeq
              }
            />
          </TabsContent>
          <TabsContent value="notes" className="mt-8">
            <NotesPane />
          </TabsContent>
        </Tabs>
      </main>

      <DeleteNoteDialog
        noteId={noteId}
        title={title}
        recording={mode === 'recording' || mode === 'paused'}
        open={deleting}
        onOpenChange={setDeleting}
        onDeleted={() => navigate('/', { replace: true })}
      />

      {(mode === 'recording' || mode === 'paused' || mode === 'finishing') && (
        <FloatingWidget label="Recording controls">
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
        </FloatingWidget>
      )}
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

function countWords(segments: PublicTranscriptSegment[]) {
  return segments.reduce(
    (total, segment) =>
      total + segment.text.split(/\s+/).filter(Boolean).length,
    0,
  );
}

// 6210 → "6,210 words".
function formatWords(count: number) {
  return `${count.toLocaleString('en-US')} ${count === 1 ? 'word' : 'words'}`;
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
