import { mkdtempSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLocalBlobStore, uploadKey } from '@summarise/blob';
import { config } from '@summarise/config';
import {
  createDatabase,
  createNoteRepository,
  createUserRepository,
  type NewNote,
} from '@summarise/storage';
import { afterAll, describe, expect, it } from 'vitest';

import { createUploadSweeper } from '../upload.sweeper';

const DAY_MS = 24 * 60 * 60 * 1000;

// Runs against the real Postgres from .env, with a temp-folder blob store.
describe('upload sweeper', async () => {
  const db = createDatabase(config.DATABASE_URL);
  const notes = createNoteRepository(db);
  const dir = mkdtempSync(join(tmpdir(), 'summarise-blob-'));
  const blob = createLocalBlobStore(dir);
  const sweeper = createUploadSweeper({ notes, blob });
  const user = await createUserRepository(db).create({
    name: 'Sweeper Test',
    email: `test+${crypto.randomUUID()}@example.com`,
  });

  afterAll(async () => {
    await db.$client.query('delete from users where id = $1', [user.id]);
    await db.$client.end();
    await rm(dir, { recursive: true, force: true });
  });

  const now = new Date();
  const longAgo = new Date(now.getTime() - 2 * DAY_MS);

  function createNote(input: Omit<NewNote, 'userId'>) {
    return notes.create({ userId: user.id, ...input });
  }

  it('deletes uploads stuck in uploading for over a day, with their file', async () => {
    const stuck = await createNote({
      source: 'upload',
      status: 'uploading',
      createdAt: longAgo,
    });
    await blob.put(uploadKey(stuck.id), Buffer.from('partial'));

    const swept = await sweeper.sweep(now);

    expect(swept).toContain(stuck.id);
    expect(await notes.findByIdForUser(stuck.id, user.id)).toBeUndefined();
    await expect(blob.get(uploadKey(stuck.id))).rejects.toThrow();
  });

  it('keeps recent uploads and notes past uploading', async () => {
    const kept = await Promise.all([
      createNote({ source: 'upload', status: 'uploading', createdAt: now }),
      createNote({
        source: 'upload',
        status: 'processing',
        createdAt: longAgo,
      }),
      createNote({
        source: 'recording',
        status: 'recording',
        createdAt: longAgo,
      }),
    ]);

    const swept = await sweeper.sweep(now);

    for (const note of kept) {
      expect(swept).not.toContain(note.id);
      expect(await notes.findByIdForUser(note.id, user.id)).toBeDefined();
    }
  });
});
