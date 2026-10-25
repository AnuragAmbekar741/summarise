import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BlobNotFoundError } from '../blob.types';
import { createLocalBlobStore } from '../local-blob.store';

describe('local blob store', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'blob-'));
  });

  afterEach(() => rm(root, { recursive: true, force: true }));

  it('stores and reads back a file, creating folders', async () => {
    const store = createLocalBlobStore(root);

    await store.put('notes/n1/chunks/00002.webm', Buffer.from('audio'));

    expect((await store.get('notes/n1/chunks/00002.webm')).toString()).toBe(
      'audio',
    );
  });

  it('overwrites an existing key and leaves no temp files', async () => {
    const store = createLocalBlobStore(root);

    await store.put('a/b.webm', Buffer.from('one'));
    await store.put('a/b.webm', Buffer.from('two'));

    expect((await store.get('a/b.webm')).toString()).toBe('two');
    expect(await readdir(join(root, 'a'))).toEqual(['b.webm']);
  });

  it('throws BlobNotFoundError for a missing key', async () => {
    const store = createLocalBlobStore(root);

    await expect(store.get('nope.webm')).rejects.toBeInstanceOf(
      BlobNotFoundError,
    );
  });

  it('deletes a key, and deleting a missing key is fine', async () => {
    const store = createLocalBlobStore(root);
    await store.put('a.webm', Buffer.from('x'));

    await store.delete('a.webm');
    await store.delete('a.webm');

    await expect(store.get('a.webm')).rejects.toBeInstanceOf(BlobNotFoundError);
  });

  it('rejects keys that escape the root folder', async () => {
    const store = createLocalBlobStore(root);

    await expect(store.put('../evil.webm', Buffer.from('x'))).rejects.toThrow(
      'invalid blob key',
    );
    await expect(store.get('/etc/passwd')).rejects.toThrow('invalid blob key');
  });
});
