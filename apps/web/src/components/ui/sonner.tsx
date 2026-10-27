import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { useTheme } from '@/hooks/theme/useTheme';

// Spec: docs/design/components/toaster.md
// Follows the theme on screen, including one picked with D.
function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme}
      position="top-center"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-success" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'rounded-xl! border-hairline! bg-surface-card! font-sans! text-body-sm! text-ink! shadow-soft!',
          description: 'text-muted-foreground!',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
