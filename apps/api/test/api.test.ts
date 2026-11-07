import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { JobEvent, JobStatus, StoredAnalysisResponse } from '@daily-gambit/contracts';
import { ChessComError } from '../src/services/chesscom.js';
import { FakePlayers, fakeGame, slowdown, startStack, waitFor } from './helpers.js';

const source = new FakePlayers([fakeGame('g1', 1_800_000_003), fakeGame('g2', 1_800_000_002), fakeGame('g3', 1_800_000_001)]);
let stack: Awaited<ReturnType<typeof startStack>>;

beforeAll(async () => {
  stack = await startStack(source);
});
afterAll(() => stack.stop());

const post = (payload: unknown) => stack.app.inject({ method: 'POST', url: '/v1/analysis/jobs', payload: payload as object });
const status = async (id: string) => (await stack.app.inject({ url: `/v1/analysis/jobs/${id}` })).json() as JobStatus;

describe('health', () => {
  it('reports the database and Redis as up', async () => {
    const res = await stack.app.inject({ url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok', database: true, redis: true });
  });
});

describe('request validation', () => {
  it('rejects a bad username, a bad limit and an unknown time control', async () => {
    expect((await post({ username: 'no spaces!' })).statusCode).toBe(400);
    expect((await post({ username: 'ok', limit: 0 })).statusCode).toBe(400);
    expect((await post({ username: 'ok', limit: 101 })).statusCode).toBe(400);
    expect((await post({ username: 'ok', timeClass: 'forever' })).statusCode).toBe(400);
    expect((await post({})).statusCode).toBe(400);
  });
  it('answers 404 for unknown jobs and 400 for a bad username on the results route', async () => {
    expect((await stack.app.inject({ url: '/v1/analysis/jobs/nope' })).statusCode).toBe(404);
    expect((await stack.app.inject({ method: 'DELETE', url: '/v1/analysis/jobs/nope' })).statusCode).toBe(404);
    expect((await stack.app.inject({ url: '/v1/players/bad%20name/analysis' })).statusCode).toBe(400);
  });
  it('returns an empty list for a player with nothing stored', async () => {
    const res = await stack.app.inject({ url: '/v1/players/nobody/analysis' });
    expect(res.json()).toEqual({ username: 'nobody', games: [] });
  });
});

describe('an analysis job, end to end (real engine, Redis and Postgres)', () => {
  it('analyses the games, streams progress, stores the results and does no repeat work', async () => {
    const created = await post({ username: 'Tester', limit: 3 });
    expect(created.statusCode).toBe(202);
    const { jobId, reused } = created.json();
    expect(reused).toBe(false);

    // A second identical request while the first runs joins it instead of starting another.
    const again = await post({ username: 'tester', limit: 3 });
    expect(again.json()).toEqual({ jobId, reused: true });

    // Follow the live stream over real HTTP until the job reports it is done.
    await stack.app.listen({ port: 0, host: '127.0.0.1' });
    const port = (stack.app.server.address() as { port: number }).port;
    const res = await fetch(`http://127.0.0.1:${port}/v1/analysis/jobs/${jobId}/events`);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const events: JobEvent[] = [];
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value);
      for (const chunk of buffer.split('\n\n').slice(0, -1)) {
        if (chunk.startsWith('data: ')) events.push(JSON.parse(chunk.slice(6)));
      }
      buffer = buffer.slice(buffer.lastIndexOf('\n\n') + 2);
    }
    expect(events[0].type).toBe('status');
    expect(events.at(-1)?.type).toBe('done');
    const progress = events.filter((e): e is Extract<JobEvent, { type: 'progress' }> => e.type === 'progress');
    expect(progress.some((e) => e.progress.phase === 'analysing' && e.progress.total === 3)).toBe(true);
    expect(progress.some((e) => e.progress.finishedGameId)).toBe(true);

    expect((await status(jobId)).state).toBe('completed');

    // Results are stored, newest game first, and are for the player's side of the board.
    const stored = (await stack.app.inject({ url: '/v1/players/TESTER/analysis' })).json() as StoredAnalysisResponse;
    expect(stored.username).toBe('tester');
    expect(stored.games.map((g) => g.meta.id)).toEqual(['g1', 'g2', 'g3']);
    const first = stored.games[0].analysis;
    expect(first.color).toBe('white');
    expect(first.plies).toHaveLength(12);
    expect(first.opening).toBe('Italian Game');
    expect(first.plies[0]).toMatchObject({ san: 'e4', clock: 180 });
    expect(first.accuracy).toBeGreaterThan(0);

    // Running the same job again does no engine work: every game is already stored.
    const second = (await post({ username: 'tester', limit: 3 })).json();
    expect(second.reused).toBe(false);
    await waitFor(async () => (await status(second.jobId)).state === 'completed');
    const final = await status(second.jobId);
    expect(final.progress?.total).toBe(0);
  });
});

describe('cancelling', () => {
  it('stops a running job and keeps the games it finished', async () => {
    await stack.deps.prisma.analyzedGame.deleteMany();
    slowdown.ms = 25; // each game now takes a few hundred milliseconds, so the job outlasts the cancel
    source.games = Array.from({ length: 100 }, (_, i) => fakeGame(`c${i}`, 1_800_000_200 - i));
    try {
      const { jobId } = (await post({ username: 'tester', limit: 100 })).json();
      await waitFor(async () => {
        const s = await status(jobId);
        return s.state === 'active' && (s.progress?.done ?? 0) >= 1 ? s : undefined;
      });
      expect((await stack.app.inject({ method: 'DELETE', url: `/v1/analysis/jobs/${jobId}` })).statusCode).toBe(202);
      const final = await waitFor(async () => {
        const s = await status(jobId);
        return s.state === 'cancelled' ? s : undefined;
      });
      expect(final.state).toBe('cancelled');
      const kept = (await stack.app.inject({ url: '/v1/players/tester/analysis' })).json() as StoredAnalysisResponse;
      expect(kept.games.length).toBeGreaterThanOrEqual(1);
      expect(kept.games.length).toBeLessThan(100);
    } finally {
      slowdown.ms = 0;
    }
  });

  it('lets the same request be queued again once the cancelled job is gone', async () => {
    const again = await post({ username: 'tester', limit: 100 });
    expect(again.json().reused).toBe(false);
    await stack.app.inject({ method: 'DELETE', url: `/v1/analysis/jobs/${again.json().jobId}` });
    await waitFor(async () => (await status(again.json().jobId)).state === 'cancelled');
  });
});

describe('failures', () => {
  it('refuses a player Chess.com does not know before anything is queued', async () => {
    source.missing.add('ghost');
    const res = await post({ username: 'Ghost' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'Chess.com player not found.' });
    expect(await stack.deps.queue.getJobCounts('waiting', 'active')).toMatchObject({ waiting: 0, active: 0 });
  });

  it('reports a player who vanishes after queueing as a failed job with a clear message', async () => {
    source.failWith = new ChessComError(404, 'nope');
    try {
      const { jobId } = (await post({ username: 'vanisher' })).json();
      const final = await waitFor(async () => {
        const s = await status(jobId);
        return s.state === 'failed' ? s : undefined;
      });
      expect(final.error).toBe('Chess.com player not found.');
    } finally {
      source.failWith = null;
    }
  });
});
