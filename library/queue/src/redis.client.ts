import { createClient } from 'redis';

export async function createRedisClient(url: string) {
  const client = createClient({ url });
  await client.connect();
  return client;
}

export type RedisClient = Awaited<ReturnType<typeof createRedisClient>>;
