import { Button } from '@/components/ui/button';

// Spec: docs/design/components/notes-pane.md
// The Notes tab, once the transcript is complete. Generated notes will go
// here; for now it offers to build them.
export function NotesPane({ className }: { className?: string }) {
  return (
    // Straight on the page, no card, like the transcript.
    <section className={className}>
      <p className="max-w-[420px] text-body-md text-muted-foreground">
        The transcript is complete. Build notes from it.
      </p>
      {/* Generating the notes is not built yet; the button does nothing. */}
      <Button className="mt-6">Build notes</Button>
    </section>
  );
}
