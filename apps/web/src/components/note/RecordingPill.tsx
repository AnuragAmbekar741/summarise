import { LoadingDots } from '@/components/common/LoadingDots';
import { formatClock } from '@/lib/time.utils';
import { cn } from '@/lib/utils';

// Spec: docs/design/components/recording-pill.md
type RecordingPillProps = {
  mode: 'recording' | 'paused' | 'finishing';
  elapsedMs: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

export function RecordingPill({
  mode,
  elapsedMs,
  onPause,
  onResume,
  onStop,
}: RecordingPillProps) {
  if (mode === 'finishing') {
    return (
      <div className="inline-flex h-12 items-center rounded-full bg-primary px-5 text-button text-on-primary">
        <LoadingDots
          label="Finishing transcript…"
          className="text-on-primary"
        />
      </div>
    );
  }

  const recording = mode === 'recording';
  return (
    <div className="inline-flex h-12 items-center rounded-full bg-primary pr-1.5 pl-5 text-on-primary">
      <span
        aria-hidden
        className={cn(
          'size-2.5 rounded-full',
          recording
            ? 'animate-pulse bg-destructive motion-reduce:animate-none'
            : 'border-2 border-on-primary/50',
        )}
      />
      <span className="ml-3 font-mono text-body-md font-medium tabular-nums">
        <span className="sr-only">{recording ? 'Recording' : 'Paused'}, </span>
        {formatClock(elapsedMs)}
      </span>
      <Divider />
      <PillButton onClick={recording ? onPause : onResume}>
        {recording ? 'Pause' : 'Resume'}
      </PillButton>
      <Divider />
      <PillButton onClick={onStop}>Stop</PillButton>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1.5 h-5 w-px bg-on-primary/25" />;
}

function PillButton(props: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className="h-9 rounded-full px-3 text-button transition-colors outline-none hover:bg-on-primary/10 focus-visible:ring-2 focus-visible:ring-on-primary/60"
      {...props}
    />
  );
}
