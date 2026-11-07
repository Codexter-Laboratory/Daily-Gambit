import { randomUUID } from 'node:crypto';
import type { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import type { CreateJobResponse, JobProgress, JobState, JobStatus } from '@daily-gambit/contracts';
import { CANCELLED, activeKey, cancelKey, type AnalysisJobData } from '../queue/queue.js';

type Deps = { queue: Queue<AnalysisJobData>; redis: Redis };

const LIVE = new Set(['waiting', 'active', 'delayed', 'prioritized', 'waiting-children']);

async function isLive(queue: Queue<AnalysisJobData>, jobId: string): Promise<boolean> {
  const job = await queue.getJob(jobId);
  return !!job && LIVE.has(await job.getState());
}

/**
 * Queues an analysis, or hands back the one already running for the same request, so double
 * clicks and several tabs do not pile up duplicate work.
 */
export async function createOrReuseJob({ queue, redis }: Deps, input: AnalysisJobData): Promise<CreateJobResponse> {
  const key = activeKey(input);
  const jobId = randomUUID();
  const claimed = await redis.set(key, jobId, 'EX', 900, 'NX');
  if (claimed !== 'OK') {
    const existing = await redis.get(key);
    if (existing && (await isLive(queue, existing))) return { jobId: existing, reused: true };
    await redis.set(key, jobId, 'EX', 900); // the earlier job is gone: take over
  }
  await queue.add('analyse', input, { jobId });
  return { jobId, reused: false };
}

export async function getJobStatus({ queue }: Pick<Deps, 'queue'>, id: string): Promise<JobStatus | null> {
  const job = await queue.getJob(id);
  if (!job) return null;
  const bull = await job.getState();
  const cancelled = bull === 'failed' && job.failedReason === CANCELLED;
  const state: JobState = cancelled ? 'cancelled' : bull === 'active' ? 'active' : bull === 'completed' ? 'completed' : bull === 'failed' ? 'failed' : 'waiting';
  const progress = typeof job.progress === 'object' && job.progress !== null ? (job.progress as JobProgress) : null;
  return { id, username: job.data.username, state, progress, error: state === 'failed' ? (job.failedReason ?? 'Analysis failed.') : null };
}

/** Stops a job: a queued one is removed, a running one is told to stop at its next position. */
export async function cancelJob({ queue, redis }: Deps, id: string): Promise<boolean> {
  const job = await queue.getJob(id);
  if (!job) return false;
  await redis.set(cancelKey(id), '1', 'EX', 3600);
  if ((await job.getState()) === 'waiting') {
    await job.remove().catch(() => undefined);
    await redis.del(activeKey(job.data), cancelKey(id));
  }
  return true;
}
