import type { TranscriptMode } from '@/components/note/TranscriptPane';
import { cn } from '@/lib/utils';

// Spec: docs/design/components/status-chip.md
const STATUSES = {
  recording: {
    label: 'Recording',
    dot: 'animate-pulse bg-destructive motion-reduce:animate-none',
  },
  paused: { label: 'Paused', dot: 'border-2 border-muted-foreground' },
  finishing: {
    label: 'Finishing',
    dot: 'animate-pulse bg-muted-foreground motion-reduce:animate-none',
  },
  ready: { label: 'Transcript ready', dot: 'bg-success' },
  elsewhere: { label: 'Recording elsewhere', dot: 'bg-destructive' },
  uploading: {
    label: 'Uploading',
    dot: 'animate-pulse bg-muted-foreground motion-reduce:animate-none',
  },
  interrupted: {
    label: 'Upload interrupted',
    dot: 'border-2 border-muted-foreground',
  },
  transcribing: {
    label: 'Transcribing',
    dot: 'animate-pulse bg-muted-foreground motion-reduce:animate-none',
  },
} as const;

// Where the note stands, at the start of the line under the title.
export function StatusChip({ mode }: { mode: TranscriptMode }) {
  const { label, dot } = STATUSES[mode];
  return (
    <span className="inline-flex h-7 items-center gap-2 rounded-full bg-surface-strong px-3 text-caption-upper text-ink uppercase">
      <span aria-hidden className={cn('size-2 rounded-full', dot)} />
      {label}
    </span>
  );
}
