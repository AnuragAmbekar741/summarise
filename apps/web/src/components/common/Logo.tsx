import { AudioLines } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

// Spec: docs/design/components/logo.md
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn('inline-flex items-center gap-2 text-ink', className)}
    >
      <AudioLines className="size-5" aria-hidden />
      <span className="font-display text-display-sm">Summarise</span>
    </Link>
  );
}
