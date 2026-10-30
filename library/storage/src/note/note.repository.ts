import { and, desc, eq, sql } from 'drizzle-orm';

import type { Database } from '../database';
import { transcriptSegments } from '../transcript-segment/transcript-segment.table';
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

    // Newest first; served by the (user_id, created_at) index.
    listByUser(userId: string): Promise<Note[]> {
      return db
        .select()
        .from(notes)
        .where(eq(notes.userId, userId))
        .orderBy(desc(notes.createdAt));
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

    // Its transcript segments go with it (on delete cascade).
    async delete(id: string): Promise<void> {
      await db.delete(notes).where(eq(notes.id, id));
    },

    // uploading → processing, only if it is still uploading. When two calls
    // race, exactly one gets the note back; the other gets undefined.
    async markUploaded(id: string): Promise<Note | undefined> {
      const [note] = await db
        .update(notes)
        .set({ status: 'processing' })
        .where(and(eq(notes.id, id), eq(notes.status, 'uploading')))
        .returning();
      return note;
    },

    // processing → ready once every expected segment exists. One statement,
    // so the status and the segment count are read together at the moment it
    // runs: a stop and the last chunk racing each other can't both miss it.
    // Returns the note if it became ready, undefined otherwise.
    async markReadyIfComplete(id: string): Promise<Note | undefined> {
      const [note] = await db
        .update(notes)
        .set({ status: 'ready' })
        .where(
          and(
            eq(notes.id, id),
            eq(notes.status, 'processing'),
            sql`(select count(*) from ${transcriptSegments} where ${transcriptSegments.noteId} = ${notes.id}) >= ${notes.totalChunks}`,
          ),
        )
        .returning();
      return note;
    },
  };
}

export type NoteRepository = ReturnType<typeof createNoteRepository>;
