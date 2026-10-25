import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import { BlobNotFoundError, type BlobStore } from './blob.types';

// Stores each key as a file under rootDir, e.g. notes/N1/chunks/00002.webm.
export function createLocalBlobStore(rootDir: string): BlobStore {
  const root = resolve(rootDir);

  // Keys are relative paths; refuse any that would land outside root.
  function pathFor(key: string) {
    const path = resolve(root, key);
    if (!path.startsWith(root + sep)) {
      throw new Error(`invalid blob key: ${key}`);
    }
    return path;
  }

  return {
    async put(key, data) {
      const path = pathFor(key);
      await mkdir(dirname(path), { recursive: true });
      // Write then rename, so a crash never leaves a half-written file.
      const tmp = `${path}.${randomUUID()}.tmp`;
      await writeFile(tmp, data);
      await rename(tmp, path);
    },

    async get(key) {
      try {
        return await readFile(pathFor(key));
      } catch (error) {
        if (isMissingFile(error)) throw new BlobNotFoundError(key);
        throw error;
      }
    },

    async delete(key) {
      await rm(pathFor(key), { force: true });
    },
  };
}

function isMissingFile(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
