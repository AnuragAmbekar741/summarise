import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/hooks/auth/useLogout';
import { useCurrentUser } from '@/hooks/user/useCurrentUser';

// Placeholder until the Notes screen is built. RequireAuth guarantees a user.
export function HomePage() {
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();

  return (
    <div className="min-h-svh bg-canvas">
      <header className="flex h-16 items-center justify-between px-4 pt-4 sm:px-12">
        <Logo />
        <Button
          variant="outline"
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          {logoutMutation.isPending ? 'Logging out…' : 'Log out'}
        </Button>
      </header>
      <main className="mx-auto max-w-content px-4 py-section sm:px-12">
        <h1 className="text-display-xl">Hello, {user?.name}</h1>
        <p className="mt-4 text-body-md text-body">
          Signed in as {user?.email}.
        </p>
      </main>
    </div>
  );
}
