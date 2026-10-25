import { z } from 'zod';

// Trim and lowercase first, so " Me@Uni.edu " and "me@uni.edu" are one user.
const EmailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const SignupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: EmailSchema,
  password: z.string().min(8).max(128),
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(128),
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
