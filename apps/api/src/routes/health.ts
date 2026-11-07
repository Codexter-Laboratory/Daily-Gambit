import type { FastifyInstance } from 'fastify';
import type { Deps } from '../server.js';

/** Liveness and dependency check, for load balancers and uptime monitors. */
export function registerHealthRoutes(app: FastifyInstance, { prisma, redis }: Deps) {
  app.get('/health', async (_req, reply) => {
    const [db, cache] = await Promise.allSettled([prisma.$queryRaw`SELECT 1`, redis.ping()]);
    const ok = db.status === 'fulfilled' && cache.status === 'fulfilled';
    return reply.code(ok ? 200 : 503).send({ status: ok ? 'ok' : 'degraded', database: db.status === 'fulfilled', redis: cache.status === 'fulfilled' });
  });
}
