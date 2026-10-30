import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { BlobNotFoundError } from '../blob.types';
import { createS3BlobStore } from '../s3-blob.store';

// Talks to the real bucket of the linked Neon branch, so it needs the AWS_*
// keys from `neon deploy` in the repo's .env. Skipped without them.
const ENV_FILE = fileURLToPath(new URL('../../../../.env', import.meta.url));
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
const env = process.env;
const configured = Boolean(
  env.AWS_ENDPOINT_URL_S3 && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY,
);

describe.skipIf(!configured)('s3 blob store (Neon)', () => {
  const store = createS3BlobStore({
    endpoint: env.AWS_ENDPOINT_URL_S3 ?? '',
    region: env.AWS_REGION ?? 'us-east-2',
    accessKeyId: env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? '',
    bucket: env.UPLOADS_BUCKET ?? 'uploads',
  });
  const prefix = `specs/${randomUUID()}/`;

  it('puts, heads, lists, gets and deletes an object', async () => {
    const key = `${prefix}a.webm`;

    await store.put(key, Buffer.from('audio'));

    expect(await store.head(key)).toEqual({ size: 5 });
    expect(await store.list(prefix)).toEqual([key]);
    expect((await store.get(key)).toString()).toBe('audio');

    await store.delete(key);
    await store.delete(key);
    expect(await store.head(key)).toBeUndefined();
    await expect(store.get(key)).rejects.toBeInstanceOf(BlobNotFoundError);
  });

  it('uploads and downloads through presigned URLs', async () => {
    const key = `${prefix}presigned.mp3`;
    const body = Buffer.from('presigned audio');

    const putUrl = await store.presignPut(key, {
      contentType: 'audio/mpeg',
      contentLength: body.length,
      expiresIn: 60,
    });
    const put = await fetch(putUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'audio/mpeg' },
      body,
    });
    expect(put.status).toBe(200);

    const getUrl = await store.presignGet(key, 60);
    const got = await fetch(getUrl);
    expect(Buffer.from(await got.arrayBuffer()).toString()).toBe(
      'presigned audio',
    );

    await store.delete(key);
  });

  it('refuses a presigned upload whose size differs from the signed one', async () => {
    const key = `${prefix}wrong-size.mp3`;

    const putUrl = await store.presignPut(key, {
      contentType: 'audio/mpeg',
      contentLength: 3,
      expiresIn: 60,
    });
    const put = await fetch(putUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'audio/mpeg' },
      body: Buffer.from('much longer than three bytes'),
    });

    expect(put.ok).toBe(false);
    expect(await store.head(key)).toBeUndefined();
  });
});
