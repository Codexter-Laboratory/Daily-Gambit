import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Redis } from 'ioredis';
import { ChessComClient, ChessComError } from '../src/services/chesscom.js';
import { ChessComHttp } from '../src/services/chessComHttp.js';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379/1', { maxRetriesPerRequest: null });
beforeEach(() => redis.flushdb());
afterAll(() => redis.disconnect());

const BASE = 'https://api.chess.com/pub/player/tester';
const thisMonth = new Date().toISOString().slice(0, 7).replace('-', '/');

function game(id: number, over: Record<string, unknown> = {}) {
  return {
    url: `https://www.chess.com/game/live/${id}`, pgn: '1. e4 e5', end_time: 1_700_000_000 + id, time_class: 'blitz', rules: 'chess', rated: true,
    white: { username: 'Tester', rating: 1500, result: 'win' }, black: { username: 'opp', rating: 1400, result: 'resigned' },
    eco: 'https://www.chess.com/openings/Italian-Game', ...over,
  };
}

type Routes = Record<string, { status?: number; body?: unknown }>;
function client(routes: Routes) {
  const state = { calls: [] as string[] };
  const impl = (async (url: string) => {
    state.calls.push(url);
    const r = routes[url];
    if (!r) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status ?? 200 });
  }) as unknown as typeof fetch;
  return { client: new ChessComClient(new ChessComHttp(redis, impl)), state };
}

const archives = (...months: string[]) => ({ [`${BASE}/games/archives`]: { body: { archives: months.map((m) => `${BASE}/games/${m}`) } } });

describe('gamesSeries', () => {
  it('keeps the chosen category, leaves variants out of standard ratings, and sorts oldest first', async () => {
    const { client: c } = client({
      ...archives('2026/09', '2026/10'),
      [`${BASE}/games/2026/09`]: { body: { games: [game(2), game(1, { time_class: 'bullet' }), game(3, { rules: 'chess960' })] } },
      [`${BASE}/games/2026/10`]: { body: { games: [game(5, { white: { username: 'Tester', rating: 1500, result: 'checkmated' }, black: { username: 'opp', rating: 1400, result: 'win' } }), game(4)] } },
    });
    const blitz = await c.gamesSeries({ username: 'tester', timeClass: 'blitz', months: 6 });
    expect(blitz.points.map((p) => p.endTime)).toEqual([1_700_000_002, 1_700_000_004, 1_700_000_005]);
    expect(blitz.summary).toEqual({ games: 3, win: 2, loss: 1, draw: 0 });
    expect(blitz.missingMonths).toBe(0);

    const variant = await c.gamesSeries({ username: 'tester', timeClass: 'chess960', months: 6 });
    expect(variant.points).toHaveLength(1);
    expect((await c.gamesSeries({ username: 'tester', timeClass: 'bullet', months: 6 })).points).toHaveLength(1);
  });

  it('only reads the requested number of months', async () => {
    const { client: c, state } = client({
      ...archives('2026/08', '2026/09', '2026/10'),
      [`${BASE}/games/2026/10`]: { body: { games: [game(1)] } },
    });
    const r = await c.gamesSeries({ username: 'tester', timeClass: 'blitz', months: 1 });
    expect(r.points).toHaveLength(1);
    expect(state.calls.filter((u) => u.includes('/games/2026/'))).toEqual([`${BASE}/games/2026/10`]);
  });

  it('treats a month Chess.com lists but does not have as empty, not as missing', async () => {
    const { client: c } = client({ ...archives('2026/09', `${thisMonth}`), [`${BASE}/games/2026/09`]: { body: { games: [game(1)] } } });
    const r = await c.gamesSeries({ username: 'tester', timeClass: 'blitz', months: 6 });
    expect(r.points).toHaveLength(1);
    expect(r.missingMonths).toBe(0);
  });

  it('reports a month that could not be loaded, and fails if none could', async () => {
    const some = client({ ...archives('2026/09', '2026/10'), [`${BASE}/games/2026/09`]: { body: { games: [game(1)] } }, [`${BASE}/games/2026/10`]: { status: 500 } });
    expect((await some.client.gamesSeries({ username: 'tester', timeClass: 'blitz', months: 6 })).missingMonths).toBe(1);

    await redis.flushdb(); // the first client cached a good month; start clean
    const none = client({ ...archives('2026/09'), [`${BASE}/games/2026/09`]: { status: 500 } });
    await expect(none.client.gamesSeries({ username: 'tester', timeClass: 'blitz', months: 6 })).rejects.toMatchObject({ status: 502 });
  });

  it('answers a repeat from the cache without asking Chess.com again', async () => {
    const { client: c, state } = client({ ...archives('2026/09'), [`${BASE}/games/2026/09`]: { body: { games: [game(1)] } } });
    await c.gamesSeries({ username: 'tester', timeClass: 'blitz', months: 6 });
    const after = state.calls.length;
    await c.gamesSeries({ username: 'tester', timeClass: 'rapid', months: 6 }); // a different category reuses the cached months
    expect(state.calls.length).toBe(after);
  });

  it('says so when the player does not exist', async () => {
    const { client: c } = client({});
    await expect(c.gamesSeries({ username: 'nobody', timeClass: 'blitz', months: 6 })).rejects.toBeInstanceOf(ChessComError);
  });
});

describe('recentGames (for the engine)', () => {
  it('returns newest first with PGNs, skipping variants and filtering by time control', async () => {
    const { client: c } = client({
      ...archives('2026/09', '2026/10'),
      [`${BASE}/games/2026/09`]: { body: { games: [game(1), game(2, { rules: 'chess960' })] } },
      [`${BASE}/games/2026/10`]: { body: { games: [game(3, { time_class: 'rapid' }), game(4)] } },
    });
    expect((await c.recentGames({ username: 'tester', limit: 10 })).map((g) => g.id)).toEqual(['4', '3', '1']);
    expect((await c.recentGames({ username: 'tester', limit: 10, timeClass: 'rapid' })).map((g) => g.id)).toEqual(['3']);
    expect((await c.recentGames({ username: 'tester', limit: 2 })).map((g) => g.id)).toEqual(['4', '3']);
  });
});
