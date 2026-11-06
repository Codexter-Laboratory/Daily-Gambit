import { Worker } from 'bullmq';
import type { PrismaClient } from '../db.js';
import type { Config } from '../config.js';
import { StockfishProcess } from '../engine/stockfishProcess.js';
import { ChessComClient } from '../services/chesscom.js';
import { AnalysisRepo } from '../services/repo.js';
import { createProcessor } from './processor.js';
import { QUEUE_NAME, createRedis, type AnalysisJobData } from './queue.js';

/** Starts the queue worker. It uses its own Redis connections: BullMQ workers block on theirs. */
export function startAnalysisWorker(config: Config, prisma: PrismaClient, log: (msg: string) => void = () => undefined) {
  const workerConnection = createRedis(config.REDIS_URL);
  const redis = createRedis(config.REDIS_URL);
  const processor = createProcessor({
    config,
    source: new ChessComClient(),
    repo: new AnalysisRepo(prisma),
    redis,
    startEngine: () => StockfishProcess.start(config.STOCKFISH_PATH),
  });

  const worker = new Worker<AnalysisJobData>(QUEUE_NAME, processor, {
    connection: workerConnection,
    concurrency: config.JOB_CONCURRENCY,
  });
  worker.on('failed', (job, err) => log(`job ${job?.id} failed: ${err.message}`));
  worker.on('error', (err) => log(`worker error: ${err.message}`));

  return {
    worker,
    async close() {
      await worker.close();
      workerConnection.disconnect();
      redis.disconnect();
    },
  };
}
