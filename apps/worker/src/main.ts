import { execFile } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { promisify } from 'node:util';

import { createS3BlobStore } from '@summarise/blob';
import { config } from '@summarise/config';
import { logger } from '@summarise/logger';
import { createRedisClient, createUploadQueue } from '@summarise/queue';
import {
  checkGroqSetup,
  createGroqSpeechToText,
  SpeechToTextError,
} from '@summarise/speech-to-text';
import {
  createDatabase,
  createNoteRepository,
  createTranscriptSegmentRepository,
} from '@summarise/storage';

import { AudioError } from './audio/audio.errors';
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
const sweeper = createUploadSweeper({
  notes,
  blob,
  queue: createUploadQueue(redis),
});
async function sweep() {
  try {
    await sweeper.sweep();
    await sweeper.requeueStuck();
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
  // A bad API key or model pauses every job, instead of failing each one,
  // until Groq accepts the setup again.
  isSetupError: (error) =>
    error instanceof SpeechToTextError && error.setupError,
  // A file with no audio, or not a media file, fails the same way each time.
  isPermanentError: (error) => error instanceof AudioError && !error.retryable,
  checkSetup: () => checkGroqSetup({ apiKey: config.GROQ_API_KEY }),
});
await worker.start();

// On a deploy or Ctrl-C: let running jobs finish, but only for so long; a
// lecture can take minutes, and the platform would kill us anyway. Jobs
// still running are picked up again on the next start, from the pieces
// already saved. A second signal exits at once.
const STOP_WAIT_MS = 20_000;
let stopping = false;
async function shutdown(signal: NodeJS.Signals) {
  if (stopping) process.exit(1);
  stopping = true;
  logger.info({ signal }, 'worker stopping');
  clearInterval(sweepTimer);
  const stopped = await Promise.race([
    worker.stop().then(() => true),
    sleep(STOP_WAIT_MS).then(() => false),
  ]);
  if (!stopped) {
    logger.warn('jobs still running; they carry on after the next start');
    process.exit(0);
  }
  await redis.close();
  await db.$client.end();
  process.exit(0);
}
process.on('SIGINT', (signal) => void shutdown(signal));
process.on('SIGTERM', (signal) => void shutdown(signal));
