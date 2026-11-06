import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import type { PrismaClient } from './db.js';
import type { Queue, QueueEvents } from 'bullmq';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import { ZodError } from 'zod';
import type { Config } from './config.js';
import type { AnalysisJobData } from './queue/queue.js';
import { registerAnalysisRoutes } from './routes/analysis.js';
import { registerHealthRoutes } from './routes/health.js';
import type { AnalysisRepo } from './services/repo.js';

export type Deps = {
  config: Config;
  prisma: PrismaClient;
  redis: Redis;
  queue: Queue<AnalysisJobData>;
  queueEvents: QueueEvents;
  repo: AnalysisRepo;
};

export async function buildServer(deps: Deps): Promise<FastifyInstance> {
  const { config } = deps;
  const app = Fastify({ logger: config.LOG_LEVEL === 'silent' ? false : { level: config.LOG_LEVEL }, trustProxy: true });

  await app.register(cors, { origin: config.WEB_ORIGIN, methods: ['GET', 'POST', 'DELETE', 'OPTIONS'] });
  // A generous global limit stops a runaway client; the job endpoint has a tighter one of its own.
  await app.register(rateLimit, { global: true, max: 300, timeWindow: '1 minute' });

  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: error.issues[0]?.message ?? 'Invalid request.' });
    }
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) req.log.error(error);
    return reply.code(status).send({ error: status >= 500 ? 'Something went wrong on our side.' : (error as Error).message });
  });

  registerHealthRoutes(app, deps);
  registerAnalysisRoutes(app, deps);
  return app;
}
