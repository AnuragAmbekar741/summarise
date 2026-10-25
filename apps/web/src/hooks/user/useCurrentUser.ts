import { useQuery } from '@tanstack/react-query';

import { getMe } from '@/api/user/user.api';

export const CURRENT_USER_KEY = ['user', 'me'] as const;

// data: the user, null when signed out, undefined while loading.
export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: getMe,
    retry: false,
    staleTime: Infinity,
  });
}
