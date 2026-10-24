import { logger } from '@summarise/logger';
import { createClient } from 'redis';

export async function createRedisClient(url: string) {
  // Fail commands right away while disconnected instead of queueing them.
  const client = createClient({ url, disableOfflineQueue: true });
  // Without a listener, a dropped connection crashes the process.
  // node-redis reconnects on its own.
  client.on('error', (error: Error) =>
    logger.error({ err: error }, 'redis error'),
  );
  await client.connect();
  return client;
}

export type RedisClient = Awaited<ReturnType<typeof createRedisClient>>;
