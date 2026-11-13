import { and, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';

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

    // Not scoped to a user: for the worker, never for a request.
    async findById(id: string): Promise<Note | undefined> {
      const [note] = await db.select().from(notes).where(eq(notes.id, id));
      return note;
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

    // processing → uploading, undoing markUploaded when the note couldn't be
    // queued, so the browser's retry of "upload complete" can try again.
    async unmarkUploaded(id: string): Promise<void> {
      await db
        .update(notes)
        .set({ status: 'uploading' })
        .where(and(eq(notes.id, id), eq(notes.status, 'processing')));
    },

    // Uploads that never finished: still uploading and created before
    // `before`. Deletes them and returns their ids.
    async deleteStaleUploads(before: Date): Promise<string[]> {
      const deleted = await db
        .delete(notes)
        .where(
          and(
            eq(notes.source, 'upload'),
            eq(notes.status, 'uploading'),
            lt(notes.createdAt, before),
          ),
        )
        .returning({ id: notes.id });
      return deleted.map((note) => note.id);
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

    // An upload's transcription is done: processing → ready, saving how many
    // pieces it had and how long it is. Only if every piece's segment exists,
    // checked in the same statement. Returns the note if it became ready.
    async finishUpload(
      id: string,
      { totalChunks, durationMs }: { totalChunks: number; durationMs: number },
    ): Promise<Note | undefined> {
      const [note] = await db
        .update(notes)
        .set({ status: 'ready', totalChunks, durationMs, endedAt: new Date() })
        .where(
          and(
            eq(notes.id, id),
            eq(notes.source, 'upload'),
            eq(notes.status, 'processing'),
            sql`(select count(*) from ${transcriptSegments} where ${transcriptSegments.noteId} = ${notes.id}) >= ${totalChunks}`,
          ),
        )
        .returning();
      return note;
    },

    // Ids of uploads being transcribed, for the sweeper to check each one
    // still has a job.
    async listProcessingUploads(): Promise<string[]> {
      const rows = await db
        .select({ id: notes.id })
        .from(notes)
        .where(and(eq(notes.source, 'upload'), eq(notes.status, 'processing')));
      return rows.map((row) => row.id);
    },

    // An upload's length, measured before transcribing it: only while it is
    // still processing and has none, so a stop that landed meanwhile keeps
    // its own.
    async setUploadLength(id: string, durationMs: number): Promise<void> {
      await db
        .update(notes)
        .set({ durationMs })
        .where(
          and(
            eq(notes.id, id),
            eq(notes.source, 'upload'),
            eq(notes.status, 'processing'),
            isNull(notes.durationMs),
          ),
        );
    },

    // An upload's transcription can't be done: processing → failed. The
    // pieces saved so far are kept for a retry.
    async markUploadFailed(id: string): Promise<void> {
      await db
        .update(notes)
        .set({ status: 'failed' })
        .where(
          and(
            eq(notes.id, id),
            eq(notes.source, 'upload'),
            eq(notes.status, 'processing'),
          ),
        );
    },

    // processing → paused. Undefined when the upload wasn't processing.
    async pauseUpload(id: string): Promise<Note | undefined> {
      const [note] = await db
        .update(notes)
        .set({ status: 'paused' })
        .where(
          and(
            eq(notes.id, id),
            eq(notes.source, 'upload'),
            eq(notes.status, 'processing'),
          ),
        )
        .returning();
      return note;
    },

    // paused or failed → processing, to carry on from the saved pieces.
    // Undefined when the upload was neither.
    async resumeUpload(id: string): Promise<Note | undefined> {
      const [note] = await db
        .update(notes)
        .set({ status: 'processing' })
        .where(
          and(
            eq(notes.id, id),
            eq(notes.source, 'upload'),
            inArray(notes.status, ['paused', 'failed']),
          ),
        )
        .returning();
      return note;
    },

    // Ends an upload's transcription early: ready with the pieces saved so
    // far. Undefined when it wasn't processing, paused or failed.
    async stopUpload(id: string): Promise<Note | undefined> {
      const [note] = await db
        .update(notes)
        .set({
          status: 'ready',
          totalChunks: sql`(select count(*) from ${transcriptSegments} where ${transcriptSegments.noteId} = ${notes.id})`,
          durationMs: sql`(select coalesce(max(${transcriptSegments.endMs}), 0) from ${transcriptSegments} where ${transcriptSegments.noteId} = ${notes.id})`,
          endedAt: new Date(),
        })
        .where(
          and(
            eq(notes.id, id),
            eq(notes.source, 'upload'),
            inArray(notes.status, ['processing', 'paused', 'failed']),
          ),
        )
        .returning();
      return note;
    },
  };
}

export type NoteRepository = ReturnType<typeof createNoteRepository>;
