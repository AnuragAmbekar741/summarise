import { createLocalBlobStore } from '@summarise/blob';
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
  blob: createLocalBlobStore(config.DATA_DIR),
  speechToText: createGroqSpeechToText({ apiKey: config.GROQ_API_KEY }),
});

app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'service listening');
});
