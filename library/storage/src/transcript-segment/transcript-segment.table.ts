import {
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { notes } from '../note/note.table';

// One row per recorded chunk (or per pasted block of text), in `seq` order.
export const transcriptSegments = pgTable(
  'transcript_segments',
  {
    id: uuid().primaryKey().defaultRandom(),
    noteId: uuid()
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    seq: integer().notNull(),
    // Offsets from the start of the recording; null for pasted text.
    startMs: integer(),
    endMs: integer(),
    // Exactly what speech-to-text returned. Never edited.
    rawText: text().notNull(),
    editedText: text(),
    // Blob storage key of this chunk's audio, when the note keeps audio.
    audioKey: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // A re-uploaded chunk replaces its own row instead of adding one.
  (table) => [unique().on(table.noteId, table.seq)],
);

export type TranscriptSegment = typeof transcriptSegments.$inferSelect;
export type NewTranscriptSegment = typeof transcriptSegments.$inferInsert;
