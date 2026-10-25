import type {
  AuthResponse,
  LoginInput,
  SignupInput,
} from '@summarise/contract';

import { postData } from '../requests';

// Each call sets or clears the auth cookies; the token refresh itself lives
// in the api client.

export function signup(input: SignupInput) {
  return postData<AuthResponse, SignupInput>('/auth/signup', input);
}

export function login(input: LoginInput) {
  return postData<AuthResponse, LoginInput>('/auth/login', input);
}

export function logout() {
  return postData<void>('/auth/logout');
}
