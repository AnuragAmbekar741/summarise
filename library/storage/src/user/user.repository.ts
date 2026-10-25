import { eq } from 'drizzle-orm';

import type { Database } from '../database';
import { users, type NewUser, type User } from './user.table';

export function createUserRepository(db: Database) {
  return {
    async findById(id: string): Promise<User | undefined> {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    },

    async findByEmail(email: string): Promise<User | undefined> {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      return user;
    },

    async create(input: NewUser): Promise<User> {
      const [user] = await db.insert(users).values(input).returning();
      // `returning()` always yields the inserted row.
      return user!;
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
