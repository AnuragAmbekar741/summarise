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
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onCancel: () => void;
};

export function UploadPill({
  mode,
  busy,
  onPause,
  onResume,
  onStop,
  onCancel,
}: UploadPillProps) {
  return (
    <div className="inline-flex h-12 items-center rounded-full bg-primary pr-1.5 pl-5 text-on-primary">
      {/* Wide enough for "Transcribing…" and its dots. */}
      <span className="w-[9.25rem] shrink-0">
        {mode === 'transcribing' ? (
          <LoadingDots label="Transcribing…" className="text-on-primary" />
        ) : (
          <span className="text-button">
            {mode === 'failed' ? 'Failed' : 'Paused'}
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
