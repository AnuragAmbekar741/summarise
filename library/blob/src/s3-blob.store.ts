import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { BlobNotFoundError, type ObjectStore } from './blob.types';

type S3BlobStoreOptions = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

// Stores each key as an object in one bucket of an S3-compatible service
// (Neon Object Storage). The bucket is private; the browser and ffmpeg reach
// single objects through short-lived presigned URLs.
export function createS3BlobStore({
  endpoint,
  region,
  accessKeyId,
  secretAccessKey,
  bucket,
}: S3BlobStoreOptions): ObjectStore {
  const client = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    // Neon only supports path-style URLs (endpoint/bucket/key).
    forcePathStyle: true,
  });

  return {
    async put(key, data) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: data }),
      );
    },

    async get(key) {
      try {
        const { Body } = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: key }),
        );
        if (!Body) throw new BlobNotFoundError(key);
        return Buffer.from(await Body.transformToByteArray());
      } catch (error) {
        if (isMissing(error)) throw new BlobNotFoundError(key);
        throw error;
      }
    },

    async delete(key) {
      // S3 deletes are already idempotent: a missing key is not an error.
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    async head(key) {
      try {
        const { ContentLength } = await client.send(
          new HeadObjectCommand({ Bucket: bucket, Key: key }),
        );
        return { size: ContentLength ?? 0 };
      } catch (error) {
        if (isMissing(error)) return undefined;
        throw error;
      }
    },

    async list(prefix) {
      const keys: string[] = [];
      let token: string | undefined;
      do {
        const page = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: token,
          }),
        );
        for (const object of page.Contents ?? []) {
          if (object.Key) keys.push(object.Key);
        }
        token = page.NextContinuationToken;
      } while (token);
      return keys;
    },

    // The type and size are signed into the URL, so the upload is refused
    // unless it sends exactly those.
    presignPut(key, { contentType, contentLength, expiresIn }) {
      return getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: contentType,
          ContentLength: contentLength,
        }),
        {
          expiresIn,
          signableHeaders: new Set(['content-type', 'content-length']),
        },
      );
    },

    presignGet(key, expiresIn) {
      return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn },
      );
    },
  };
}

function isMissing(error: unknown) {
  return error instanceof NoSuchKey || error instanceof NotFound;
}
