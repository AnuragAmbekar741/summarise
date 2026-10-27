import { GradientOrb } from '@/components/common/GradientOrb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Spec: docs/design/components/notes-pane.md
// The Notes tab, once the transcript is complete. Generated notes will go
// here; for now it offers to build them.
export function NotesPane({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border border-hairline bg-surface-card px-6 py-8 shadow-soft sm:p-10',
        className,
      )}
    >
      <GradientOrb color="mint" className="-top-64 left-[10%] size-[520px]" />
      <GradientOrb
        color="lavender"
        className="-top-72 -right-40 size-[560px]"
      />

      <div className="relative">
        <p className="max-w-[420px] text-body-md text-muted-foreground">
          The transcript is complete. Build notes from it.
        </p>
        {/* Generating the notes is not built yet; the button does nothing. */}
        <Button className="mt-6">Build notes</Button>
      </div>
    </section>
  );
}
