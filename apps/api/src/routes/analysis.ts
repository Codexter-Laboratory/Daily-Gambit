import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateJobSchema, MAX_GAMES_PER_JOB, USERNAME_RE, type CreateJobResponse, type JobEvent, type JobProgress, type JobStatus, type StoredAnalysisResponse } from '@daily-gambit/contracts';
import { HttpError, secondsUntilUtcMidnight } from '../errors.js';
import { originMatcher } from '../cors.js';
import { CANCELLED } from '../queue/queue.js';
import { cancelJob, createOrReuseJob, getJobStatus } from '../services/jobs.js';
import type { Deps } from '../server.js';

const HEARTBEAT_MS = 15_000;
const IdParams = z.object({ id: z.string().min(1).max(100) });
const UserParams = z.object({ username: z.string().regex(USERNAME_RE, 'Invalid Chess.com username.') });
const ListQuery = z.object({ limit: z.coerce.number().int().min(1).max(500).default(MAX_GAMES_PER_JOB) });

/**
 * Protection against work piling up. This API has no logins, so the limits are by client address:
 * the queue itself is capped, and each address may start a fixed number of new jobs per day.
 */
async function enforceLimits({ queue, redis, config }: Deps, ip: string): Promise<void> {
  if ((await queue.getWaitingCount()) >= config.MAX_QUEUED_JOBS) {
    throw new HttpError(503, 'The analysis queue is full right now. Please try again in a few minutes.', { 'Retry-After': '60' });
  }
  const key = `analysis:quota:${ip}:${new Date().toISOString().slice(0, 10)}`;
  const used = await redis.incr(key);
  if (used === 1) await redis.expire(key, 86_400 + 60);
  if (used > config.DAILY_JOB_LIMIT) {
    throw new HttpError(429, 'You have reached the daily analysis limit. Please try again tomorrow.', { 'Retry-After': String(secondsUntilUtcMidnight()) });
  }
}

export function registerAnalysisRoutes(app: FastifyInstance, deps: Deps) {
  const { queue, queueEvents, repo, config } = deps;
  const isAllowedOrigin = originMatcher(config.WEB_ORIGIN);

  /** Start an analysis. Answers at once; progress comes from the status or the event stream. */
  app.post('/v1/analysis/jobs', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
    const input = CreateJobSchema.parse(req.body);
    const username = input.username.toLowerCase();
    // Refuse a player that does not exist now, with a clear answer, instead of failing a queued job later.
    await deps.chessCom.profile(username);
    const result: CreateJobResponse = await createOrReuseJob(deps, { ...input, username }, async () => {
      await enforceLimits(deps, req.ip);
    });
    return reply.code(202).send(result);
  });

  app.get('/v1/analysis/jobs/:id', async (req, reply) => {
    const { id } = IdParams.parse(req.params);
    const status = await getJobStatus(deps, id);
    return status ? status : reply.code(404).send({ error: 'No such job.' });
  });

  app.delete('/v1/analysis/jobs/:id', async (req, reply) => {
    const { id } = IdParams.parse(req.params);
    return (await cancelJob(deps, id)) ? reply.code(202).send({ ok: true }) : reply.code(404).send({ error: 'No such job.' });
  });

  /**
   * Live progress as server-sent events. The stream ends when the job does. Listeners are
   * attached before the first status is read, so a job that finishes in between is not missed.
   */
  app.get('/v1/analysis/jobs/:id/events', async (req, reply) => {
    const { id } = IdParams.parse(req.params);
    reply.hijack();
    const raw = reply.raw;
    const origin = req.headers.origin;
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      // hijack() skips the CORS plugin, so the header is set here, for an allowed origin only.
      ...(origin && isAllowedOrigin(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    });

    let closed = false;
    const send = (event: JobEvent) => !closed && raw.write(`data: ${JSON.stringify(event)}\n\n`);
    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      queueEvents.off('progress', onProgress);
      queueEvents.off('completed', onCompleted);
      queueEvents.off('failed', onFailed);
      raw.end();
    };
    const onProgress = ({ jobId, data }: { jobId: string; data: unknown }) => jobId === id && send({ type: 'progress', progress: data as JobProgress });
    const onCompleted = ({ jobId }: { jobId: string }) => {
      if (jobId !== id) return;
      send({ type: 'done' });
      cleanup();
    };
    const onFailed = ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      if (jobId !== id) return;
      send(failedReason === CANCELLED ? { type: 'cancelled' } : { type: 'error', message: failedReason });
      cleanup();
    };
    const heartbeat = setInterval(() => !closed && raw.write(': ping\n\n'), HEARTBEAT_MS);

    queueEvents.on('progress', onProgress);
    queueEvents.on('completed', onCompleted);
    queueEvents.on('failed', onFailed);
    req.raw.on('close', cleanup);

    const status: JobStatus | null = await getJobStatus(deps, id);
    if (!status) {
      send({ type: 'error', message: 'No such job.' });
      return cleanup();
    }
    send({ type: 'status', status });
    if (status.state === 'completed') send({ type: 'done' });
    else if (status.state === 'cancelled') send({ type: 'cancelled' });
    else if (status.state === 'failed') send({ type: 'error', message: status.error ?? 'Analysis failed.' });
    if (['completed', 'cancelled', 'failed'].includes(status.state)) cleanup();
  });

  /** Everything stored for a player, newest first. */
  app.get('/v1/players/:username/analysis', async (req, reply) => {
    const { username } = UserParams.parse(req.params);
    const { limit } = ListQuery.parse(req.query);
    const name = username.toLowerCase();
    const games = await repo.list(name, limit);
    const body: StoredAnalysisResponse = { username: name, games };
    return reply.header('Cache-Control', 'no-store').send(body);
  });
}
