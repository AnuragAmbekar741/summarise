import { cn } from '@/lib/utils';

// Spec: docs/design/components/gradient-orb.md
const ORB_COLORS = {
  mint: 'from-orb-mint',
  peach: 'from-orb-peach',
  lavender: 'from-orb-lavender',
  sky: 'from-orb-sky',
  rose: 'from-orb-rose',
} as const;

type GradientOrbProps = {
  color: keyof typeof ORB_COLORS;
  // Position and size, e.g. "-top-40 -left-40 size-[640px]".
  className?: string;
};

export function GradientOrb({ color, className }: GradientOrbProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute rounded-full bg-radial to-transparent to-70% opacity-(--orb-opacity) blur-2xl',
        ORB_COLORS[color],
        className,
      )}
    />
  );
}
