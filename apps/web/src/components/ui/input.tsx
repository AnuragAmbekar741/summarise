import * as React from 'react';

import { cn } from '@/lib/utils';

// Spec: docs/design/components/input.md
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-11 w-full min-w-0 rounded-md border border-hairline-strong bg-surface-card px-4 text-body-md text-ink transition-colors outline-none placeholder:text-muted-soft focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
