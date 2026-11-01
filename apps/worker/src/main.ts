import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { createS3BlobStore } from '@summarise/blob';
import { config } from '@summarise/config';
import { logger } from '@summarise/logger';
import { createRedisClient, createUploadQueue } from '@summarise/queue';
import { createGroqSpeechToText } from '@summarise/speech-to-text';
import {
  createDatabase,
  createNoteRepository,
  createTranscriptSegmentRepository,
} from '@summarise/storage';

import { createUploadSweeper } from './upload/upload.sweeper';
import { createUploadTranscriber } from './upload/upload.transcriber';
import { createUploadWorker } from './upload/upload.worker';

const SWEEP_EVERY_MS = 4 * 60 * 60 * 1000;

// Every upload needs ffmpeg; without it, refuse to start rather than fail
// each job.
try {
  await promisify(execFile)('ffmpeg', ['-version']);
} catch (error) {
  logger.fatal({ err: error }, 'ffmpeg is not installed');
  process.exit(1);
}

const redis = await createRedisClient(config.REDIS_URL);
const db = createDatabase(config.DATABASE_URL);
const blob = createS3BlobStore({
  endpoint: config.AWS_ENDPOINT_URL_S3,
  region: config.AWS_REGION,
  accessKeyId: config.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  bucket: config.UPLOADS_BUCKET,
});
const notes = createNoteRepository(db);
logger.info({ redis: await redis.ping() }, 'worker started');

// Once at start, then every 4 hours. A failed sweep is retried on the next one.
const sweeper = createUploadSweeper({ notes, blob });
async function sweep() {
  try {
    await sweeper.sweep();
  } catch (error) {
    logger.error({ err: error }, 'upload sweep failed');
  }
}
void sweep();
const sweepTimer = setInterval(sweep, SWEEP_EVERY_MS);

const transcriber = createUploadTranscriber({
  blob,
  notes,
  segments: createTranscriptSegmentRepository(db),
  speechToText: createGroqSpeechToText({ apiKey: config.GROQ_API_KEY }),
});
const worker = createUploadWorker({
  // Each loop waits on its own connection.
  async openQueue() {
    const connection = await createRedisClient(config.REDIS_URL);
    return {
      queue: createUploadQueue(connection),
      close: async () => void (await connection.close()),
    };
  },
  notes,
  handle: (note, signal) => transcriber.transcribe(note, signal),
  concurrency: config.WORKER_CONCURRENCY,
});
await worker.start();

// On a deploy or Ctrl-C: finish the running jobs, then close up. A second
// signal exits at once; those jobs are picked up again on the next start.
let stopping = false;
async function shutdown(signal: NodeJS.Signals) {
  if (stopping) process.exit(1);
  stopping = true;
  logger.info({ signal }, 'worker stopping');
  clearInterval(sweepTimer);
  await worker.stop();
  await redis.close();
  await db.$client.end();
  process.exit(0);
}
process.on('SIGINT', (signal) => void shutdown(signal));
process.on('SIGTERM', (signal) => void shutdown(signal));
