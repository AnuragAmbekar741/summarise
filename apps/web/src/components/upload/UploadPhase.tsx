import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

type UploadPhaseProps = {
  mode: 'uploading' | 'transcribing' | 'uploadPaused' | 'failed';
  // 0 to 1 through the current step; null while unknown.
  progress: number | null;
};

const HINTS = {
  uploading: 'Keep this tab open until your file has been sent.',
  transcribing: 'You can close this tab. Transcription carries on without it.',
  uploadPaused: 'Paused. Resume carries on from where it stopped.',
  failed:
    'Retry carries on from where it stopped, or Stop to keep what’s done.',
};

// Where an uploaded recording is, under its note's title: sending the file
// from this tab, then transcribing it on our side. Says which one is true
// now, because only the first needs the tab to stay open.
export function UploadPhase({ mode, progress }: UploadPhaseProps) {
  const sending = mode === 'uploading';
  return (
    <div className="mt-6 max-w-[520px] space-y-2.5">
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption">
        <li
          className={cn(
            'flex items-center gap-1.5',
            sending ? 'font-medium text-ink' : 'text-muted-foreground',
          )}
        >
          {!sending && <Check className="size-3.5" aria-hidden />}
          {sending ? '1 · Sending your file' : 'File sent'}
        </li>
        <li aria-hidden className="h-px w-5 bg-hairline-strong" />
        <li
          className={cn(
            sending ? 'text-muted-foreground' : 'font-medium text-ink',
          )}
        >
          2 · Transcribing
        </li>
      </ol>
      <div className="h-0.5 overflow-hidden rounded-full bg-hairline">
        <div
          className="h-full rounded-full bg-ink transition-[width] duration-500"
          style={{ width: `${(progress ?? 0) * 100}%` }}
        />
      </div>
      <p className="text-caption text-muted-foreground">{HINTS[mode]}</p>
    </div>
  );
}
