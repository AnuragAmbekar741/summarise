import * as React from 'react';
import { Label as LabelPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

// Spec: docs/design/components/label.md
function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'text-body-strong text-ink select-none peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
