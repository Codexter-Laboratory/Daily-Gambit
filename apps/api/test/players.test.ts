import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FakePlayers, startStack } from './helpers.js';

const players = new FakePlayers();
let stack: Awaited<ReturnType<typeof startStack>>;
beforeAll(async () => {
  stack = await startStack(players);
});
afterAll(() => stack.stop());
beforeEach(() => {
  players.missing.clear();
  players.down = false;
});

const get = (url: string) => stack.app.inject({ url });

describe('player read endpoints', () => {
  it.each([
    ['profile', (b: Record<string, unknown>) => (b.profile as { username: string }).username === 'hikaru'],
    ['stats', (b: Record<string, unknown>) => 'stats' in b],
    ['clubs', (b: Record<string, unknown>) => 'clubs' in b],
    ['tournaments', (b: Record<string, unknown>) => 'tournaments' in b],
    ['matches', (b: Record<string, unknown>) => 'matches' in b],
    ['current-games', (b: Record<string, unknown>) => 'currentGames' in b],
  ])('/%s returns the player’s data under the lowercase username', async (path, ok) => {
    const res = await get(`/v1/players/HiKaRu/${path}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().username).toBe('hikaru');
    expect(ok(res.json())).toBe(true);
  });

  it('/online returns the online status', async () => {
    expect((await get('/v1/players/hikaru/online')).json()).toEqual({ online: true });
  });

  it('/games returns the series and validates its query', async () => {
    const ok = await get('/v1/players/hikaru/games?timeClass=rapid&months=12');
    expect(ok.json()).toMatchObject({ username: 'hikaru', timeClass: 'rapid', months: 12, missingMonths: 0 });
    expect((await get('/v1/players/hikaru/games')).json()).toMatchObject({ timeClass: 'blitz', months: 6 }); // defaults
    expect((await get('/v1/players/hikaru/games?timeClass=nope')).statusCode).toBe(400);
    expect((await get('/v1/players/hikaru/games?months=0')).statusCode).toBe(400);
    expect((await get('/v1/players/hikaru/games?months=37')).statusCode).toBe(400);
  });

  it('passes ?fresh=1 down so the cache can be skipped', async () => {
    await get('/v1/players/hikaru/profile');
    expect(players.lastFresh).toBe(false);
    await get('/v1/players/hikaru/profile?fresh=1');
    expect(players.lastFresh).toBe(true);
  });

  it('answers 404 for a player Chess.com does not have, 502 when Chess.com is down, 400 for a bad name', async () => {
    players.missing.add('ghost');
    const missing = await get('/v1/players/ghost/profile');
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: 'Chess.com player not found.' });

    players.down = true;
    const down = await get('/v1/players/hikaru/stats');
    expect(down.statusCode).toBe(502);
    expect(down.json().error).toMatch(/unavailable/i);

    expect((await get('/v1/players/bad%20name/profile')).statusCode).toBe(400);
  });
});
