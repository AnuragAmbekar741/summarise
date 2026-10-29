// Where binary files (recorded audio) live. Local disk in development; a
// bucket (R2 or S3) implements the same interface in production.
export interface BlobStore {
  put(key: string, data: Buffer): Promise<void>;
  // Rejects with BlobNotFoundError when the key doesn't exist.
  get(key: string): Promise<Buffer>;
  // Deleting a missing key is not an error.
  delete(key: string): Promise<void>;
}

// A BlobStore in a bucket that can also hand out presigned URLs, so the
// browser and the worker reach one object without the service's keys.
export interface ObjectStore extends BlobStore {
  // Size in bytes, or undefined when the key doesn't exist.
  head(key: string): Promise<{ size: number } | undefined>;
  // Every key that starts with `prefix`.
  list(prefix: string): Promise<string[]>;
  presignPut(
    key: string,
    options: { contentType: string; contentLength: number; expiresIn: number },
  ): Promise<string>;
  presignGet(key: string, expiresIn: number): Promise<string>;
}

export class BlobNotFoundError extends Error {
  constructor(key: string) {
    super(`blob not found: ${key}`);
    this.name = 'BlobNotFoundError';
  }
}
