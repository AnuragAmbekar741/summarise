// Where binary files (recorded audio) live. Local disk in development; a
// bucket (R2 or S3) implements the same interface in production.
export interface BlobStore {
  put(key: string, data: Buffer): Promise<void>;
  // Rejects with BlobNotFoundError when the key doesn't exist.
  get(key: string): Promise<Buffer>;
  // Deleting a missing key is not an error.
  delete(key: string): Promise<void>;
}

export class BlobNotFoundError extends Error {
  constructor(key: string) {
    super(`blob not found: ${key}`);
    this.name = 'BlobNotFoundError';
  }
}
