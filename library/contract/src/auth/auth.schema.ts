import { z } from 'zod';

// Trim and lowercase first, so " Me@Uni.edu " and "me@uni.edu" are one user.
const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email'));

// Messages are shown under the form fields as-is.
export const SignupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter your name')
    .max(100, 'Use at most 100 characters'),
  email: EmailSchema,
  password: z
    .string()
    .min(8, 'Use at least 8 characters')
    .max(128, 'Use at most 128 characters'),
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z
    .string()
    .min(1, 'Enter your password')
    .max(128, 'Use at most 128 characters'),
});

export const UserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  createdAt: z.iso.datetime(),
});

export const AuthResponseSchema = z.object({
  user: UserSchema,
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type PublicUser = z.infer<typeof UserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
