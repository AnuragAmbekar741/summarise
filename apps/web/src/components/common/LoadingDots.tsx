import { cn } from '@/lib/utils';

// Spec: docs/design/components/loading-dots.md
type LoadingDotsProps = {
  // Shimmering text after the dots, e.g. "Listening…".
  label?: string;
  className?: string;
};

export function LoadingDots({ label, className }: LoadingDotsProps) {
  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-3 text-muted-foreground',
        className,
      )}
    >
      <span aria-hidden className="flex gap-1">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="size-1.5 animate-dot rounded-full bg-current motion-reduce:animate-none"
            style={{ animationDelay: `${dot * 160}ms` }}
          />
        ))}
      </span>
      {label && (
        <span className="shimmer-text animate-shimmer motion-reduce:animate-none">
          {label}
        </span>
      )}
    </span>
  );
}
