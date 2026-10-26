import { CircleUserRound } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/hooks/auth/useLogout';
import { useCurrentUser } from '@/hooks/user/useCurrentUser';

// Spec: docs/design/components/account-menu.md
export function AccountMenu() {
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account"
        className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors outline-none hover:bg-surface-strong focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CircleUserRound className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-body-sm font-medium text-ink">
            {user?.name}
          </p>
          <p className="truncate text-caption text-muted-foreground">
            {user?.email}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={logoutMutation.isPending}
          onSelect={() => logoutMutation.mutate()}
        >
          {logoutMutation.isPending ? 'Logging out…' : 'Log out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
