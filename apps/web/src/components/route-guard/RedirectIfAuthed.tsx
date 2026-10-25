import { Navigate, Outlet } from 'react-router-dom';

import { useCurrentUser } from '@/hooks/user/useCurrentUser';

// Wraps login and signup: a signed-in user goes straight to the app.
export function RedirectIfAuthed() {
  const { data: user, isPending } = useCurrentUser();

  if (isPending) return null;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}
