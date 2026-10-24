import type { Health } from '@summarise/contract';
import type { RedisClient } from '@summarise/queue';
import type { Database } from '@summarise/storage';
import { Router } from 'express';

async function check(probe: () => Promise<unknown>) {
  try {
    await probe();
    return 'up' as const;
  } catch {
    return 'down' as const;
  }
}

export function healthRoutes(db: Database, redis: RedisClient) {
  return Router().get('/', async (_req, res) => {
    const [postgres, redisStatus] = await Promise.all([
      check(() => db.execute('select 1')),
      check(() => redis.ping()),
    ]);
    const ok = postgres === 'up' && redisStatus === 'up';
    const body: Health = {
      status: ok ? 'ok' : 'error',
      postgres,
      redis: redisStatus,
    };
    res.status(ok ? 200 : 503).json(body);
  });
}
