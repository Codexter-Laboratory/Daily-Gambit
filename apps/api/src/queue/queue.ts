import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import type { CreateJob } from '@daily-gambit/contracts';

export const QUEUE_NAME = 'analysis';

export type AnalysisJobData = CreateJob;

/** BullMQ needs `maxRetriesPerRequest: null` on connections used for blocking commands. */
export function createRedis(url: string): Redis {
  return new Redis(url, { maxRetriesPerRequest: null });
}

export function createAnalysisQueue(connection: Redis): Queue<AnalysisJobData> {
  return new Queue<AnalysisJobData>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      // A job that fails for a passing reason (Chess.com hiccup, engine crash) is tried once more.
      // Finished games are stored as they complete, so a retry only does the remaining work.
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600, count: 500 },
      removeOnFail: { age: 86_400 },
    },
  });
}

export const cancelKey = (jobId: string) => `analysis:cancel:${jobId}`;
export const activeKey = (input: AnalysisJobData) => `analysis:active:${input.username}:${input.timeClass ?? 'all'}:${input.limit}`;

/** What the worker writes with `failedReason` when a job is stopped on request. */
export const CANCELLED = 'cancelled';
