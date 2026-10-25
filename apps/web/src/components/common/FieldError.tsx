// Spec: docs/design/components/field-error.md
type FieldErrorProps = {
  // Matches the input's aria-describedby.
  id: string;
  message?: string;
};

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-caption text-destructive">
      {message}
    </p>
  );
}
