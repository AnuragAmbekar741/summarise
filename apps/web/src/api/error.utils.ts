import { ErrorResponseSchema, type ErrorResponse } from '@summarise/contract';
import axios from 'axios';

// The service's `{ error: { code, message, details } }`, if the error is one.
export function getApiError(error: unknown): ErrorResponse['error'] | null {
  if (!axios.isAxiosError(error)) return null;
  const parsed = ErrorResponseSchema.safeParse(error.response?.data);
  return parsed.success ? parsed.data.error : null;
}

export function getErrorMessage(error: unknown) {
  const apiError = getApiError(error);
  if (apiError) return apiError.message;
  if (axios.isAxiosError(error) && !error.response) {
    return "Can't reach the server. Check your connection and try again.";
  }
  return 'Something went wrong. Please try again.';
}
