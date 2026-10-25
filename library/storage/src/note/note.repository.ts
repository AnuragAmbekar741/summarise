import { and, eq } from 'drizzle-orm';

import type { Database } from '../database';
import { notes, type NewNote, type Note } from './note.table';

export function createNoteRepository(db: Database) {
  return {
    async create(input: NewNote): Promise<Note> {
      const [note] = await db.insert(notes).values(input).returning();
      // `returning()` always yields the inserted row.
      return note!;
    },

    // Scoped to the owner, so another user's note reads as missing.
    async findByIdForUser(
      id: string,
      userId: string,
    ): Promise<Note | undefined> {
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, id), eq(notes.userId, userId)));
      return note;
    },

    async update(
      id: string,
      patch: Partial<Omit<NewNote, 'id' | 'userId'>>,
    ): Promise<Note> {
      const [note] = await db
        .update(notes)
        .set(patch)
        .where(eq(notes.id, id))
        .returning();
      if (!note) throw new Error(`note ${id} not found`);
      return note;
    },
  };
}

export type NoteRepository = ReturnType<typeof createNoteRepository>;
