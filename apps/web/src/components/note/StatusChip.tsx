import { cn } from '@/lib/utils';

// Spec: docs/design/components/status-chip.md
type StatusChipProps = {
  status: 'ready' | 'elsewhere';
};

const LABELS = {
  ready: 'Transcript ready',
  elsewhere: 'Recording elsewhere',
} as const;

// Where the note stands, in the header when this tab isn't recording it.
export function StatusChip({ status }: StatusChipProps) {
  return (
    <div className="inline-flex h-11 items-center gap-2.5 rounded-full bg-surface-strong px-5 text-caption-upper text-ink uppercase">
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full',
          status === 'ready' ? 'bg-success' : 'bg-destructive',
        )}
      />
      {LABELS[status]}
    </div>
  );
}
