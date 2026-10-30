import { createS3BlobStore } from '@summarise/blob';
import { config } from '@summarise/config';
import { logger } from '@summarise/logger';
import { createRedisClient } from '@summarise/queue';
import { createGroqSpeechToText } from '@summarise/speech-to-text';
import { createDatabase } from '@summarise/storage';

import { createApp } from './app';

const db = createDatabase(config.DATABASE_URL);
const redis = await createRedisClient(config.REDIS_URL);

const app = createApp({
  db,
  redis,
  config,
  blob: createS3BlobStore({
    endpoint: config.AWS_ENDPOINT_URL_S3,
    region: config.AWS_REGION,
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    bucket: config.UPLOADS_BUCKET,
  }),
  speechToText: createGroqSpeechToText({ apiKey: config.GROQ_API_KEY }),
});

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'service listening');
});
