import { cn } from '@/lib/utils';

// Spec: docs/design/components/wave-lines.md
export function WaveLines({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 160"
      preserveAspectRatio="none"
      fill="none"
      className={cn(
        'pointer-events-none absolute inset-x-0 h-40 w-full text-hairline-strong',
        className,
      )}
    >
      <path
        d="M0 70 C 180 20, 360 10, 540 60 S 900 120, 1080 60 S 1320 20, 1440 50"
        stroke="currentColor"
      />
      <path
        d="M0 110 C 200 140, 380 40, 560 90 S 880 150, 1100 80 S 1340 90, 1440 40"
        stroke="currentColor"
      />
    </svg>
  );
}
