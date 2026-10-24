// Spec: docs/design/components/or-divider.md
export function OrDivider() {
  return (
    <div className="flex items-center gap-4" role="separator">
      <span className="h-px flex-1 bg-hairline" />
      <span className="text-caption-upper text-muted-foreground uppercase">
        Or
      </span>
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}
