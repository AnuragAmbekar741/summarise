// Spec: docs/design/components/page-gradient.md
// The sky wash at the top right of every full page. Dark mode dims it with
// `--wash-opacity`. The parent must be `relative` and `overflow-hidden`.
export function PageGradient() {
  return (
    <div
      aria-hidden
      className="bg-sky-wash pointer-events-none absolute inset-0 opacity-(--wash-opacity)"
    />
  );
}
