import type { PublicTranscriptSegment } from '@summarise/contract';

import { LoadingDots } from '@/components/common/LoadingDots';
import { formatTimestamp } from '@/lib/time.utils';

// Spec: docs/design/components/transcript-pane.md
export type TranscriptMode =
  | 'recording'
  | 'paused'
  | 'finishing'
  | 'ready'
  // Recording, but in another browser: nothing to control from here.
  | 'elsewhere'
  // An uploaded file: being sent from this tab, cut off before it arrived,
  // or arrived and being transcribed.
  | 'uploading'
  | 'interrupted'
  | 'transcribing';

type TranscriptPaneProps = {
  segments: PublicTranscriptSegment[];
  mode: TranscriptMode;
  // Chunks recorded in this browser that aren't in the transcript yet.
  transcribing: boolean;
  // How far (0 to 1) this tab has sent the file, while uploading.
  uploadProgress?: number;
  className?: string;
};

export function TranscriptPane({
  segments,
  mode,
  transcribing,
  uploadProgress = 0,
  className,
}: TranscriptPaneProps) {
  // The next line of the transcript starts where the last one ended.
  const nextMs = segments.at(-1)?.endMs ?? 0;

  return (
    // Straight on the page, no card: it's the main reading area.
    <section className={className}>
      <ol className="space-y-6">
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
        {mode === 'uploading' && (
          <Line ms={null}>
            <LoadingDots
              label={`Uploading the recording · ${Math.round(uploadProgress * 100)}%`}
            />
          </Line>
        )}
        {mode === 'transcribing' && (
          <Line ms={nextMs}>
            <LoadingDots label="Transcribing the recording…" />
          </Line>
        )}
      </ol>

      {mode === 'interrupted' && (
        <p className="text-body-md text-muted-foreground">
          The upload stopped before it finished. Delete this note and upload the
          file again.
        </p>
      )}
      {mode === 'ready' && segments.length === 0 && (
        <p className="text-body-md text-muted-foreground">
          Nothing was said in this recording.
        </p>
      )}
    </section>
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
