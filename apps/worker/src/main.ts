import { config } from '@summarise/config';
import { createRedisClient } from '@summarise/queue';

// The open Redis connection keeps the process running. Jobs get consumed here later.
const redis = await createRedisClient(config.REDIS_URL);
console.log('worker started, redis:', await redis.ping());
