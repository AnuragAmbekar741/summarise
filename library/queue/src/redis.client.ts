import { logger } from '@summarise/logger';
import { createClient } from 'redis';

export async function createRedisClient(url: string) {
  let connected = false;
  const client = createClient({
    url,
    // Fail commands right away while disconnected instead of queueing them.
    disableOfflineQueue: true,
    socket: {
      // If Redis is unreachable at startup, give up so connect() rejects and
      // the process exits. Once connected, keep retrying a dropped connection.
      reconnectStrategy: (retries, cause) =>
        connected ? Math.min(retries * 50, 2000) : cause,
    },
  });
  client.on('ready', () => {
    connected = true;
  });
  // Without a listener, a dropped connection crashes the process.
  // node-redis reconnects on its own.
  client.on('error', (error: Error) =>
    logger.error({ err: error }, 'redis error'),
  );
  await client.connect();
  return client;
}

export type RedisClient = Awaited<ReturnType<typeof createRedisClient>>;
