import type { AuthResponse, PublicUser } from '@summarise/contract';

import { getApiError } from '../error.utils';
import { getData } from '../requests';

// The signed-in user, or null when there is no session (even after the
// client has tried a token refresh).
export async function getMe(): Promise<PublicUser | null> {
  try {
    const { user } = await getData<AuthResponse>('/auth/me');
    return user;
  } catch (error) {
    if (getApiError(error)?.code === 'UNAUTHENTICATED') return null;
    throw error;
  }
}
