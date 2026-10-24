import { config } from '@summarise/config';
import { logger } from '@summarise/logger';
import { createRedisClient } from '@summarise/queue';

// The open Redis connection keeps the process running. Jobs get consumed here later.
const redis = await createRedisClient(config.REDIS_URL);
logger.info({ redis: await redis.ping() }, 'worker started');
