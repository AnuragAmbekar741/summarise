import type { LoginInput, PublicUser, SignupInput } from '@summarise/contract';
import type { User, UserRepository } from '@summarise/storage';

import { HttpError } from '../../common/error.utils';
import { hashPassword, verifyPassword } from './password.utils';

export function createAuthService(users: UserRepository) {
  // Checked when the email is unknown, so a missing account takes as long
  // as a wrong password and the response time doesn't reveal which it was.
  const dummyHash = hashPassword('summarise-dummy-password');

  return {
    async signup(input: SignupInput): Promise<PublicUser> {
      if (await users.findByEmail(input.email)) throw emailTaken();

      const passwordHash = await hashPassword(input.password);
      try {
        const user = await users.create({
          name: input.name,
          email: input.email,
          passwordHash,
        });
        return toPublicUser(user);
      } catch (error) {
        // Two signups with the same email at once: the unique index wins.
        if (isUniqueViolation(error)) throw emailTaken();
        throw error;
      }
    },

    async login(input: LoginInput): Promise<PublicUser> {
      const user = await users.findByEmail(input.email);
      const valid = await verifyPassword(
        user?.passwordHash ?? (await dummyHash),
        input.password,
      );
      if (!user?.passwordHash || !valid) {
        throw new HttpError(
          401,
          'INVALID_CREDENTIALS',
          'Email or password is incorrect',
        );
      }
      return toPublicUser(user);
    },

    async getUser(id: string): Promise<PublicUser> {
      const user = await users.findById(id);
      if (!user) {
        throw new HttpError(401, 'UNAUTHENTICATED', 'Not signed in');
      }
      return toPublicUser(user);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

function emailTaken() {
  return new HttpError(
    409,
    'EMAIL_TAKEN',
    'An account with this email already exists',
  );
}

// Postgres code 23505; drizzle wraps the driver error in `cause`.
function isUniqueViolation(error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined;
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'code' in cause &&
    cause.code === '23505'
  );
}
