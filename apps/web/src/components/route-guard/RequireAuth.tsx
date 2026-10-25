import { Navigate, Outlet } from 'react-router-dom';

import { useCurrentUser } from '@/hooks/user/useCurrentUser';

// Wraps routes that need a signed-in user.
export function RequireAuth() {
  const { data: user, isPending } = useCurrentUser();

  // Render nothing until we know, so the page doesn't flash.
  if (isPending) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
