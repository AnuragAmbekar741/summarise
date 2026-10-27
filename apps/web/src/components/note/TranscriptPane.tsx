import type { PublicTranscriptSegment } from '@summarise/contract';

import { LoadingDots } from '@/components/common/LoadingDots';
import { formatDuration, formatTimestamp } from '@/lib/time.utils';
import { cn } from '@/lib/utils';

// Spec: docs/design/components/transcript-pane.md
export type TranscriptMode =
  | 'recording'
  | 'paused'
  | 'finishing'
  | 'ready'
  // Recording, but in another browser: nothing to control from here.
  | 'elsewhere';

type TranscriptPaneProps = {
  segments: PublicTranscriptSegment[];
  mode: TranscriptMode;
  // The recording's length, known once it has stopped.
  durationMs: number | null;
  // Chunks recorded in this browser that haven't uploaded yet.
  pendingChunks: number;
  // Chunks recorded in this browser that aren't in the transcript yet.
  transcribing: boolean;
  className?: string;
};

export function TranscriptPane({
  segments,
  mode,
  durationMs,
  pendingChunks,
  transcribing,
  className,
}: TranscriptPaneProps) {
  // The next line of the transcript starts where the last one ended.
  const nextMs = segments.at(-1)?.endMs ?? 0;

  return (
    <section className={cn('px-4 py-8 sm:px-12 sm:py-12', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-sans text-caption-upper text-ink uppercase">
          Transcript
        </h2>
        <p className="text-caption text-muted-foreground">
          {captionFor({ mode, pendingChunks, segments, durationMs })}
        </p>
      </div>

      <ol className="mt-8 space-y-6">
        {segments.map((segment) => (
          <Line key={segment.seq} ms={segment.startMs}>
            {segment.transcriptionFailed ? (
              <span className="text-muted-foreground italic">
                Couldn't transcribe this part.
              </span>
            ) : (
              segment.text
            )}
          </Line>
        ))}

        {mode === 'recording' && (
          <Line ms={nextMs}>
            <LoadingDots label="Listening…" />
          </Line>
        )}
        {/* Paused, but the part cut at the pause is still on its way. */}
        {(mode === 'finishing' || (mode === 'paused' && transcribing)) && (
          <Line ms={nextMs}>
            <LoadingDots label="Transcribing the last part…" />
          </Line>
        )}
      </ol>

      {mode === 'ready' && segments.length === 0 && (
        <p className="mt-8 text-body-md text-muted-foreground">
          Nothing was said in this recording.
        </p>
      )}
    </section>
  );
}

function captionFor({
  mode,
  pendingChunks,
  segments,
  durationMs,
}: {
  mode: TranscriptMode;
  pendingChunks: number;
  segments: PublicTranscriptSegment[];
  durationMs: number | null;
}) {
  if (pendingChunks > 0) {
    return `${pendingChunks} ${pendingChunks === 1 ? 'part' : 'parts'} uploading`;
  }
  if (mode === 'elsewhere') return 'Recording on another device';
  if (mode === 'ready' && segments.length > 0) {
    const words = countWords(segments);
    const length = `${words.toLocaleString('en-US')} ${words === 1 ? 'word' : 'words'}`;
    // "48 min · 6,210 words"
    return durationMs === null
      ? length
      : `${formatDuration(durationMs)} · ${length}`;
  }
  return null;
}

function countWords(segments: PublicTranscriptSegment[]) {
  return segments.reduce(
    (total, segment) =>
      total + segment.text.split(/\s+/).filter(Boolean).length,
    0,
  );
}

function Line({
  ms,
  children,
}: {
  ms: number | null;
  children: React.ReactNode;
}) {
  return (
    <li className="grid grid-cols-[3.5rem_1fr] gap-x-4">
      <span className="pt-0.5 font-mono text-caption text-muted-foreground tabular-nums">
        {ms === null ? '' : formatTimestamp(ms)}
      </span>
      <span className="text-body-md text-body-strong">{children}</span>
    </li>
  );
}
