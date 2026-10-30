import { CreateUploadSchema } from '@summarise/contract';
import { FileAudio, Upload, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { FieldError } from '@/components/common/FieldError';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUploads } from '@/hooks/upload/useUploads';
import { cn } from '@/lib/utils';

// Spec: docs/design/components/upload-dialog.md
type UploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const uploads = useUploads();
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const [dragging, setDragging] = useState(false);

  function choose(next: File | undefined) {
    if (!next) return;
    const problem = checkFile(next);
    setFile(problem ? null : next);
    setError(problem);
  }

  // While open, a file dropped anywhere in the window is chosen, so a drop
  // that misses the zone doesn't make the browser open the file and leave
  // the app. Enter and leave fire for every element the drag crosses, so a
  // counter tells when it has really left the window.
  useEffect(() => {
    if (!open) return;
    let depth = 0;
    const onEnter = (event: DragEvent) => {
      event.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const onLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onOver = (event: DragEvent) => event.preventDefault();
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      depth = 0;
      setDragging(false);
      const dropped = event.dataTransfer?.files[0];
      if (!dropped) return;
      const problem = checkFile(dropped);
      setFile(problem ? null : dropped);
      setError(problem);
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [open]);

  function close(nextOpen: boolean) {
    if (!nextOpen) {
      setFile(null);
      setError(undefined);
      setDragging(false);
    }
    onOpenChange(nextOpen);
  }

  function upload() {
    if (!file) return;
    // Runs in the background; the notes list shows its progress.
    void uploads.start(file);
    close(false);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="gap-6 rounded-3xl p-7 sm:max-w-[460px]">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="font-display text-display-sm font-light text-ink">
            Upload a recording
          </DialogTitle>
          <DialogDescription className="text-body-sm">
            An audio or video file of a lecture, up to 500 MB.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            choose(event.target.files?.[0]);
            // Lets the same file be picked again after removing it.
            event.target.value = '';
          }}
        />

        <div className="space-y-2">
          {file ? (
            <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-canvas-soft px-4 py-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-strong text-ink">
                <FileAudio className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm text-ink">{file.name}</p>
                <p className="text-caption text-muted-foreground">
                  {formatSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Remove file"
                onClick={() => setFile(null)}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-surface-strong hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-describedby={error ? errorId : undefined}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-9 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                dragging
                  ? 'border-ink bg-surface-strong'
                  : error
                    ? 'border-destructive/60 hover:bg-canvas-soft'
                    : 'border-hairline-strong hover:bg-canvas-soft',
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-surface-strong text-ink">
                <Upload className="size-5" />
              </span>
              <span>
                <span className="block text-body-sm text-ink">
                  {dragging ? 'Drop to choose it' : 'Drop a file here'}
                </span>
                <span className="block text-caption text-muted-foreground">
                  or{' '}
                  <span className="underline underline-offset-4">browse</span>{' '}
                  your files
                </span>
              </span>
            </button>
          )}
          <FieldError id={errorId} message={error} />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button disabled={!file} onClick={upload}>
            Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// The same checks the service runs, so a bad file is caught here. Returns
// what's wrong with it, or undefined when it's fine.
function checkFile(file: File) {
  const result = CreateUploadSchema.safeParse({
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  });
  return result.success ? undefined : result.error.issues[0]?.message;
}

// 91234567 → "87 MB"
function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
