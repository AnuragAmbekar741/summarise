import { GradientOrb } from '@/components/common/GradientOrb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Spec: docs/design/components/notes-pane.md
type NotesPaneProps = {
  // True once the transcript is complete. Until then the whole card is
  // dimmed and can't be used.
  canBuild: boolean;
  className?: string;
};

export function NotesPane({ canBuild, className }: NotesPaneProps) {
  return (
    <section className={cn('px-4 pb-4 sm:px-8 sm:pb-8', className)}>
      <div
        // `inert` keeps clicks and Tab out while the transcript is running.
        inert={!canBuild}
        aria-disabled={!canBuild}
        className={cn(
          'relative min-h-full overflow-hidden rounded-2xl border border-hairline bg-surface-card px-6 py-8 shadow-soft transition-opacity sm:px-12 sm:py-12',
          !canBuild && 'opacity-50 select-none',
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
          <Button className="mt-6">Build notes</Button>
        </div>
      </div>
    </section>
  );
}
