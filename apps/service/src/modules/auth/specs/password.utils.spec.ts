import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '../utils/password.utils';

describe('password utils', () => {
  it('hashes with argon2id', async () => {
    expect(await hashPassword('correct horse')).toMatch(/^\$argon2id\$/);
  });

  it('verifies the right password', async () => {
    const hash = await hashPassword('correct horse');

    expect(await verifyPassword(hash, 'correct horse')).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse');

    expect(await verifyPassword(hash, 'wrong horse')).toBe(false);
  });

  it('rejects a malformed hash', async () => {
    expect(await verifyPassword('not-a-hash', 'correct horse')).toBe(false);
  });
});
