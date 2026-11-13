import { LoadingDots } from '@/components/common/LoadingDots';
import { cn } from '@/lib/utils';

// An uploaded file's transcription, floating over its note like the
// recording controls: Pause or Resume (Retry once failed), Stop to keep the
// transcript so far, Cancel to delete the note. Its size never changes with
// the state, so no button moves under the pointer: a second click on Pause
// would otherwise land on Stop.
type UploadPillProps = {
  mode: 'transcribing' | 'uploadPaused' | 'failed';
  // An action is on its way to the service.
  busy: boolean;
  // A second line under the label, e.g. "18:20 of 1:00:00".
  detail?: string;
  // 0 to 1, drawn as a thin line along the bottom; null while unknown.
  progress?: number | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
};

export function UploadPill({
  mode,
  busy,
  detail,
  progress,
  onPause,
  onResume,
  onStop,
  onCancel,
}: UploadPillProps) {
  return (
    <div className="relative inline-flex h-12 items-center overflow-hidden rounded-full bg-primary pr-1.5 pl-5 text-on-primary">
      {/* Wide enough for "Transcribing…" and its dots. */}
      <span className="flex w-[9.25rem] shrink-0 flex-col justify-center gap-1">
        {mode === 'transcribing' ? (
          <LoadingDots label="Transcribing…" className="text-on-primary" />
        ) : (
          <span className="text-button">
            {mode === 'failed' ? 'Failed' : 'Paused'}
          </span>
        )}
        {detail && (
          <span className="truncate font-mono text-[12px] leading-none text-on-primary/70 tabular-nums">
            {detail}
          </span>
        )}
      </span>
      <Divider />
      {mode === 'transcribing' ? (
        <PillButton onClick={onPause} disabled={busy} className="w-[5.25rem]">
          Pause
        </PillButton>
      ) : (
        <PillButton onClick={onResume} disabled={busy} className="w-[5.25rem]">
          {mode === 'failed' ? 'Retry' : 'Resume'}
        </PillButton>
      )}
      <Divider />
      <PillButton onClick={onStop} disabled={busy}>
        Stop
      </PillButton>
      <Divider />
      <PillButton onClick={onCancel} disabled={busy}>
        Cancel
      </PillButton>
      {progress != null && (
        <span
          aria-hidden
          className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-on-primary/20"
        >
          <span
            className="block h-full rounded-full bg-on-primary transition-[width] duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </span>
      )}
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1.5 h-5 w-px bg-on-primary/25" />;
}

function PillButton({ className, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'h-9 rounded-full px-3 text-button transition-colors outline-none hover:bg-on-primary/10 focus-visible:ring-2 focus-visible:ring-on-primary/60 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
