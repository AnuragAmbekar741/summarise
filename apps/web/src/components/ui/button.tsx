import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Slot } from 'radix-ui';

// Spec: docs/design/components/button.md
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 font-sans text-button whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          'rounded-full bg-primary text-on-primary hover:bg-primary-active active:bg-primary-active',
        outline:
          'rounded-full border border-hairline-strong bg-transparent text-ink hover:bg-surface-strong active:bg-surface-strong',
        secondary:
          'rounded-full bg-surface-strong text-ink hover:bg-hairline active:bg-hairline',
        destructive:
          'rounded-full bg-destructive text-white hover:bg-destructive/90 active:bg-destructive/90',
        tertiary: 'rounded-full text-ink underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5',
        lg: 'h-12 px-6',
        icon: 'size-10',
      },
    },
    compoundVariants: [
      // 1px less padding + 1px border keeps the label where the primary pill puts it.
      { variant: 'outline', size: 'default', className: 'px-[19px]' },
      { variant: 'outline', size: 'lg', className: 'px-[23px]' },
      { variant: 'tertiary', size: 'default', className: 'h-auto px-0' },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'primary',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
