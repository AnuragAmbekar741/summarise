import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from '../user/user.table';

export const noteSource = pgEnum('note_source', ['recording', 'text']);

// recording → processing (stopped, last chunks still arriving) → ready.
export const noteStatus = pgEnum('note_status', [
  'recording',
  'processing',
  'ready',
]);

export const notes = pgTable(
  'notes',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text().notNull().default('Untitled note'),
    source: noteSource().notNull().default('recording'),
    status: noteStatus().notNull().default('recording'),
    // Save each chunk's audio to blob storage as well as transcribing it.
    keepAudio: boolean().notNull().default(false),
    // Set on stop; the note is ready once this many segments exist.
    totalChunks: integer(),
    durationMs: integer(),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index().on(table.userId, table.createdAt)],
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
