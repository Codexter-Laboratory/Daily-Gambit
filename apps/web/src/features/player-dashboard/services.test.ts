import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.com');
const { fetchGames, fetchProfile, fetchStats, filterToMoveGames } = await import('./services');

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
let fetchMock: MockInstance<typeof fetch>;
beforeEach(() => {
  fetchMock = vi.spyOn(globalThis, 'fetch');
});

describe('fetchers', () => {
  it('ask the API for the right path, with the username encoded, and unwrap the payload', async () => {
    fetchMock.mockResolvedValueOnce(ok({ username: 'a-b', profile: { username: 'a-b' } }));
    expect(await fetchProfile('a-b')).toEqual({ username: 'a-b' });
    expect(fetchMock).toHaveBeenLastCalledWith('https://api.example.com/v1/players/a-b/profile', undefined);

    fetchMock.mockResolvedValueOnce(ok({ stats: { chess_blitz: {} } }));
    expect(await fetchStats('x y')).toEqual({ chess_blitz: {} });
    expect(fetchMock).toHaveBeenLastCalledWith('https://api.example.com/v1/players/x%20y/stats', undefined);
  });

  it('can ask the API to skip its cache', async () => {
    fetchMock.mockResolvedValueOnce(ok({ stats: {} }));
    await fetchStats('hikaru', { fresh: true });
    expect(String(fetchMock.mock.lastCall?.[0])).toBe('https://api.example.com/v1/players/hikaru/stats?fresh=1');
  });

  it('sends the games filters in the query', async () => {
    fetchMock.mockResolvedValueOnce(ok({ points: [], summary: { games: 0, win: 0, loss: 0, draw: 0 }, missingMonths: 0 }));
    await fetchGames('hikaru', 'rapid', 12);
    expect(String(fetchMock.mock.lastCall?.[0])).toBe('https://api.example.com/v1/players/hikaru/games?timeClass=rapid&months=12');
  });
});

describe('filterToMoveGames', () => {
  const game = (white: string, black: string, turn: string) => ({
    white: { url: `https://api.chess.com/pub/player/${white}` },
    black: { url: `https://api.chess.com/pub/player/${black}` },
    turn,
  });

  it('keeps only games where it is this player’s turn, for either colour, ignoring case', () => {
    const games = [game('Tester', 'opp', 'white'), game('opp', 'tester', 'black'), game('tester', 'opp', 'black'), game('a', 'b', 'white')];
    expect(filterToMoveGames({ games }, 'TESTER').games).toEqual([games[0], games[1]]);
  });

  it('copes with no data', () => {
    expect(filterToMoveGames(null, 'x')).toEqual({ games: [] });
    expect(filterToMoveGames({}, 'x')).toEqual({ games: [] });
  });
});
