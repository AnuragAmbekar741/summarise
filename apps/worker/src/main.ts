import { createS3BlobStore } from '@summarise/blob';
import { config } from '@summarise/config';
import { logger } from '@summarise/logger';
import { createRedisClient } from '@summarise/queue';
import { createDatabase, createNoteRepository } from '@summarise/storage';

import { createUploadSweeper } from './upload/upload.sweeper';

const SWEEP_EVERY_MS = 4 * 60 * 60 * 1000;

// The open Redis connection keeps the process running. Jobs get consumed here later.
const redis = await createRedisClient(config.REDIS_URL);
const db = createDatabase(config.DATABASE_URL);
const blob = createS3BlobStore({
  endpoint: config.AWS_ENDPOINT_URL_S3,
  region: config.AWS_REGION,
  accessKeyId: config.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  bucket: config.UPLOADS_BUCKET,
});
logger.info({ redis: await redis.ping() }, 'worker started');

// Once at start, then every 4 hours. A failed sweep is retried on the next one.
const sweeper = createUploadSweeper({ notes: createNoteRepository(db), blob });
async function sweep() {
  try {
    await sweeper.sweep();
  } catch (error) {
    logger.error({ err: error }, 'upload sweep failed');
  }
}
void sweep();
setInterval(sweep, SWEEP_EVERY_MS);
