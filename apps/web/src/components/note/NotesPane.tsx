import { GradientOrb } from '@/components/common/GradientOrb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Spec: docs/design/components/notes-pane.md
type NotesPaneProps = {
  // True once the transcript is complete.
  canBuild: boolean;
  className?: string;
};

export function NotesPane({ canBuild, className }: NotesPaneProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden px-4 py-8 sm:px-12 sm:py-12',
        className,
      )}
    >
      <GradientOrb color="mint" className="-top-64 left-[10%] size-[520px]" />
      <GradientOrb
        color="lavender"
        className="-top-72 -right-40 size-[560px]"
      />

      <div className="relative">
        <h2 className="font-sans text-caption-upper text-ink uppercase">
          Notes
        </h2>
        <p className="mt-8 max-w-[420px] text-body-md text-muted-foreground">
          {canBuild
            ? 'The transcript is complete. Build notes from it.'
            : 'Notes appear here after you build them. You can build them once the transcript is complete.'}
        </p>
        {/* Generating the notes is not built yet; the button does nothing. */}
        <Button className="mt-6" disabled={!canBuild}>
          Build notes
        </Button>
      </div>
    </section>
  );
}
