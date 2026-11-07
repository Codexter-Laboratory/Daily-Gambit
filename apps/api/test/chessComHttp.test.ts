import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Redis } from 'ioredis';
import { ChessComError, ChessComHttp } from '../src/services/chessComHttp.js';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379/1', { maxRetriesPerRequest: null });
beforeEach(() => redis.flushdb());
afterAll(() => redis.disconnect());

type Reply = { status?: number; body?: unknown; delay?: number };

/** A fetch that plays back replies in order (the last one repeats) and counts calls. */
function fakeFetch(...replies: Reply[]) {
  const state = { calls: 0 };
  const impl = (async (_url: string, init?: RequestInit) => {
    const reply = replies[Math.min(state.calls, replies.length - 1)];
    state.calls += 1;
    if (reply.delay) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, reply.delay);
        init?.signal?.addEventListener('abort', () => (clearTimeout(timer), reject(init.signal!.reason)));
      });
    }
    return new Response(JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200 });
  }) as unknown as typeof fetch;
  return { impl, state };
}

const URL1 = 'https://api.chess.com/pub/player/x';

describe('ChessComHttp caching', () => {
  it('serves a repeat from the cache and goes back to Chess.com when asked for fresh data', async () => {
    const f = fakeFetch({ body: { n: 1 } }, { body: { n: 2 } });
    const http = new ChessComHttp(redis, f.impl);
    expect(await http.getJson(URL1, { ttl: 60 })).toEqual({ n: 1 });
    expect(await http.getJson(URL1, { ttl: 60 })).toEqual({ n: 1 });
    expect(f.state.calls).toBe(1);
    expect(await http.getJson(URL1, { ttl: 60, fresh: true })).toEqual({ n: 2 });
    expect(await http.getJson(URL1, { ttl: 60 })).toEqual({ n: 2 }); // the fresh answer replaced the old one
  });

  it('is shared between processes: a second client sees the first one’s answer', async () => {
    const f = fakeFetch({ body: { n: 1 } });
    await new ChessComHttp(redis, f.impl).getJson(URL1, { ttl: 60 });
    await new ChessComHttp(redis, f.impl).getJson(URL1, { ttl: 60 });
    expect(f.state.calls).toBe(1);
  });

  it('turns simultaneous requests for one thing into a single Chess.com call', async () => {
    const f = fakeFetch({ body: { n: 1 }, delay: 50 });
    const http = new ChessComHttp(redis, f.impl);
    const results = await Promise.all(Array.from({ length: 6 }, () => http.getJson(URL1, { ttl: 60 })));
    expect(results.every((r) => (r as { n: number }).n === 1)).toBe(true);
    expect(f.state.calls).toBe(1);
  });

  it('remembers that a player does not exist, so made-up names do not hammer Chess.com', async () => {
    const f = fakeFetch({ status: 404 });
    const http = new ChessComHttp(redis, f.impl);
    await expect(http.getJson(URL1, { ttl: 60 })).rejects.toMatchObject({ status: 404 });
    await expect(http.getJson(URL1, { ttl: 60 })).rejects.toMatchObject({ status: 404 });
    expect(f.state.calls).toBe(1);
  });

  it('works without Redis, and keeps working when Redis is broken', async () => {
    const f = fakeFetch({ body: { n: 1 } });
    expect(await new ChessComHttp(null, f.impl).getJson(URL1, { ttl: 60 })).toEqual({ n: 1 });
    const broken = { get: async () => { throw new Error('down'); }, set: async () => { throw new Error('down'); } } as unknown as Redis;
    expect(await new ChessComHttp(broken, f.impl).getJson(URL1, { ttl: 60 })).toEqual({ n: 1 });
  });
});

describe('ChessComHttp failures', () => {
  it('retries once after a server error', async () => {
    const f = fakeFetch({ status: 500 }, { body: { ok: true } });
    expect(await new ChessComHttp(null, f.impl).getJson(URL1, { ttl: 1 })).toEqual({ ok: true });
    expect(f.state.calls).toBe(2);
  });

  it('gives up after two server errors with a 502', async () => {
    const f = fakeFetch({ status: 503 });
    await expect(new ChessComHttp(null, f.impl).getJson(URL1, { ttl: 1 })).rejects.toMatchObject({ status: 502 });
    expect(f.state.calls).toBe(2);
  });

  it('does not retry an error a second try cannot fix', async () => {
    const f = fakeFetch({ status: 403 });
    await expect(new ChessComHttp(null, f.impl).getJson(URL1, { ttl: 1 })).rejects.toMatchObject({ status: 403 });
    expect(f.state.calls).toBe(1);
  });

  it('times out a call that never answers', async () => {
    const f = fakeFetch({ delay: 5_000 });
    const started = Date.now();
    await expect(new ChessComHttp(null, f.impl, 80).getJson(URL1, { ttl: 1 })).rejects.toBeInstanceOf(ChessComError);
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it('stops when the caller aborts', async () => {
    const f = fakeFetch({ delay: 5_000 });
    const controller = new AbortController();
    const pending = new ChessComHttp(null, f.impl).getJson(URL1, { ttl: 1, signal: controller.signal });
    setTimeout(() => controller.abort(), 30);
    await expect(pending).rejects.toBeDefined();
  });
});
