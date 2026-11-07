import { afterEach, describe, expect, it } from 'vitest';
import { FakePlayers, fakeGame, startStack, waitFor } from './helpers.js';

let stack: Awaited<ReturnType<typeof startStack>> | undefined;
let release: (() => void) | undefined;
afterEach(async () => {
  release?.(); // let a held job finish so the worker can shut down
  release = undefined;
  await stack?.stop();
  stack = undefined;
});

const post = (payload: object, headers: Record<string, string> = {}) => stack!.app.inject({ method: 'POST', url: '/v1/analysis/jobs', payload, headers });

describe('daily limit per client', () => {
  it('refuses new jobs past the limit with a Retry-After, but joining a running job is free', async () => {
    const players = new FakePlayers([fakeGame('a')]);
    players.gate = new Promise((resolve) => (release = resolve)); // keep jobs busy so they can be joined
    stack = await startStack(players, { DAILY_JOB_LIMIT: '2' });

    const one = await post({ username: 'tester', limit: 1 });
    const two = await post({ username: 'tester', limit: 2 });
    expect([one.statusCode, two.statusCode]).toEqual([202, 202]);

    // Same request as the first: joins the running job, so it does not use up the allowance.
    expect((await post({ username: 'tester', limit: 1 })).json().reused).toBe(true);

    const three = await post({ username: 'tester', limit: 3 });
    expect(three.statusCode).toBe(429);
    expect(three.json().error).toMatch(/daily/i);
    expect(Number(three.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('does not charge for a job that was refused', async () => {
    const players = new FakePlayers([fakeGame('a')]);
    players.gate = new Promise((resolve) => (release = resolve));
    stack = await startStack(players, { DAILY_JOB_LIMIT: '1', MAX_QUEUED_JOBS: '1' });
    await post({ username: 'tester', limit: 1 }); // takes the allowance
    expect((await post({ username: 'tester', limit: 2 })).statusCode).toBe(429);
    // The refused request released its claim, so asking again is refused for the same reason, not as "already running".
    const again = await post({ username: 'tester', limit: 2 });
    expect(again.statusCode).toBe(429);
  });
});

describe('queue cap', () => {
  it('answers 503 with Retry-After when too many jobs are waiting', async () => {
    const players = new FakePlayers([fakeGame('a')]);
    players.gate = new Promise((resolve) => (release = resolve));
    stack = await startStack(players, { MAX_QUEUED_JOBS: '1', DAILY_JOB_LIMIT: '100' });

    const first = (await post({ username: 'tester', limit: 1 })).json();
    await waitFor(async () => (await stack!.app.inject({ url: `/v1/analysis/jobs/${first.jobId}` })).json().state === 'active'); // running, not waiting
    expect((await post({ username: 'tester', limit: 2 })).statusCode).toBe(202); // now one is waiting
    const full = await post({ username: 'tester', limit: 3 });
    expect(full.statusCode).toBe(503);
    expect(full.headers['retry-after']).toBe('60');
  });
});

describe('request handling', () => {
  it('gives every response a request id, and keeps a sane one the caller sent', async () => {
    stack = await startStack(new FakePlayers());
    const generated = await stack.app.inject({ url: '/health' });
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    const kept = await stack.app.inject({ url: '/health', headers: { 'x-request-id': 'trace-123' } });
    expect(kept.headers['x-request-id']).toBe('trace-123');
    const replaced = await stack.app.inject({ url: '/health', headers: { 'x-request-id': 'bad id with spaces' } });
    expect(replaced.headers['x-request-id']).not.toBe('bad id with spaces');
    expect(generated.headers['x-content-type-options']).toBe('nosniff');
  });

  it('refuses an oversized body', async () => {
    stack = await startStack(new FakePlayers());
    const res = await post({ username: 'tester', padding: 'x'.repeat(20_000) });
    expect(res.statusCode).toBe(413);
  });
});
