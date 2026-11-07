import { QueueEvents } from 'bullmq';
import { createPrisma } from './db.js';
import type { Config } from './config.js';
import { createAnalysisQueue, createRedis, QUEUE_NAME } from './queue/queue.js';
import { ChessComHttp } from './services/chessComHttp.js';
import { ChessComClient } from './services/chesscom.js';
import { AnalysisRepo } from './services/repo.js';
import type { Deps } from './server.js';

/** Creates every shared connection. `close()` shuts them all down in order. */
export function createDeps(config: Config): Deps & { close(): Promise<void> } {
  const prisma = createPrisma(config.DATABASE_URL);
  const redis = createRedis(config.REDIS_URL);
  const queue = createAnalysisQueue(createRedis(config.REDIS_URL));
  const events = createRedis(config.REDIS_URL);
  const queueEvents = new QueueEvents(QUEUE_NAME, { connection: events });
  // One listener per open event stream, so the default limit of 10 is too low.
  queueEvents.setMaxListeners(0);

  return {
    config,
    prisma,
    redis,
    queue,
    queueEvents,
    repo: new AnalysisRepo(prisma),
    chessCom: new ChessComClient(new ChessComHttp(redis)),
    async close() {
      await queueEvents.close();
      await queue.close();
      redis.disconnect();
      events.disconnect();
      await prisma.$disconnect();
    },
  };
}
