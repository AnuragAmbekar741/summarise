import axios, { type InternalAxiosRequestConfig } from 'axios';

// One axios instance for every call to the service. Auth lives in httpOnly
// cookies, so withCredentials is all a request needs to be signed in.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  withCredentials: true,
});

// A 401 from these means wrong credentials or a finished session, not an
// expired access token, so refreshing would not help.
const NO_REFRESH_URLS = ['/auth/login', '/auth/signup', '/auth/refresh'];

type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Requests that fail together share one refresh call.
let refreshing: Promise<void> | null = null;

function refreshSession() {
  refreshing ??= apiClient
    .post('/auth/refresh')
    .then(() => undefined)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// Access token expired → refresh it once, then retry the original request.
// If the refresh fails too, the original 401 goes back to the caller.
apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error)) throw error;

  const config = error.config as RetryableConfig | undefined;
  const canRefresh =
    error.response?.status === 401 &&
    config !== undefined &&
    !config._retried &&
    !NO_REFRESH_URLS.includes(config.url ?? '');
  if (!canRefresh) throw error;

  config._retried = true;
  try {
    await refreshSession();
  } catch {
    throw error;
  }
  return apiClient(config);
});
