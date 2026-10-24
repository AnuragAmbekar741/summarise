import { createClient } from 'redis';

export async function createRedisClient(url: string) {
  // Fail commands right away while disconnected instead of queueing them.
  const client = createClient({ url, disableOfflineQueue: true });
  // Without a listener, a dropped connection crashes the process.
  // node-redis reconnects on its own.
  client.on('error', (error: Error) => console.error('redis error:', error.message));
  await client.connect();
  return client;
}

export type RedisClient = Awaited<ReturnType<typeof createRedisClient>>;
