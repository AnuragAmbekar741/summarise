import { hash, verify } from '@node-rs/argon2';

// Argon2id with the library's defaults.
export function hashPassword(password: string) {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password);
  } catch {
    // A malformed hash is a failed check, not a crash.
    return false;
  }
}
