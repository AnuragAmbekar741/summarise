import { LoadingDots } from '@/components/common/LoadingDots';

// An uploaded file's transcription, floating over its note like the
// recording controls: Pause or Resume (Retry once failed), Stop to keep the
// transcript so far, Cancel to delete the note.
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
      {mode === 'transcribing' ? (
        <LoadingDots label="Transcribing…" className="text-on-primary" />
      ) : (
        <span className="text-button">
          {mode === 'failed' ? 'Transcription failed' : 'Paused'}
        </span>
      )}
      <Divider />
      {mode === 'transcribing' ? (
        <PillButton onClick={onPause} disabled={busy}>
          Pause
        </PillButton>
      ) : (
        <PillButton onClick={onResume} disabled={busy}>
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

function PillButton(props: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className="h-9 rounded-full px-3 text-button transition-colors outline-none hover:bg-on-primary/10 focus-visible:ring-2 focus-visible:ring-on-primary/60 disabled:opacity-50"
      {...props}
    />
  );
}
