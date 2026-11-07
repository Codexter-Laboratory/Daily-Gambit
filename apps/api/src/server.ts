import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import type { PrismaClient } from './db.js';
import type { Queue, QueueEvents } from 'bullmq';
import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import { ZodError } from 'zod';
import type { Config } from './config.js';
import { originMatcher } from './cors.js';
import { HttpError } from './errors.js';
import type { AnalysisJobData } from './queue/queue.js';
import { registerAnalysisRoutes } from './routes/analysis.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerPlayerRoutes } from './routes/players.js';
import { ChessComError, type PlayerData } from './services/chesscom.js';
import type { AnalysisRepo } from './services/repo.js';

export type Deps = {
  config: Config;
  prisma: PrismaClient;
  redis: Redis;
  queue: Queue<AnalysisJobData>;
  queueEvents: QueueEvents;
  repo: AnalysisRepo;
  chessCom: PlayerData;
};

export async function buildServer(deps: Deps): Promise<FastifyInstance> {
  const { config } = deps;
  const app = Fastify({
    logger: config.LOG_LEVEL === 'silent' ? false : { level: config.LOG_LEVEL },
    trustProxy: config.TRUST_PROXY,
    // The API only takes tiny JSON bodies, so a big one is a mistake or an attack.
    bodyLimit: 10_000,
    // Reuse the caller's request id if it is sane, so a request can be followed across services.
    genReqId: (req) => {
      const given = req.headers['x-request-id'];
      return typeof given === 'string' && /^[\w.-]{1,64}$/.test(given) ? given : randomUUID();
    },
  });

  app.addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', req.id);
    reply.header('x-content-type-options', 'nosniff');
  });

  const isAllowedOrigin = originMatcher(config.WEB_ORIGIN);
  await app.register(cors, {
    // Requests with no Origin (curl, server-to-server) are not browser cross-origin calls; they pass.
    origin: (origin, callback) => callback(null, !origin || isAllowedOrigin(origin)),
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    exposedHeaders: ['x-request-id', 'retry-after'],
  });
  // A generous global limit stops a runaway client; the job endpoint has a tighter one of its own.
  await app.register(rateLimit, { global: true, max: 300, timeWindow: '1 minute' });

  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: error.issues[0]?.message ?? 'Invalid request.' });
    }
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).headers(error.headers).send({ error: error.message });
    }
    if (error instanceof ChessComError) {
      // Chess.com says there is no such player, or it is not answering. Neither is our server's fault.
      if (error.status === 404) return reply.code(404).send({ error: 'Chess.com player not found.' });
      req.log.warn({ chessComStatus: error.status }, 'Chess.com request failed');
      return reply.code(502).send({ error: 'Chess.com is unavailable right now. Please try again shortly.' });
    }
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) req.log.error(error);
    return reply.code(status).send({ error: status >= 500 ? 'Something went wrong on our side.' : (error as Error).message });
  });

  registerHealthRoutes(app, deps);
  registerPlayerRoutes(app, deps);
  registerAnalysisRoutes(app, deps);
  return app;
}
