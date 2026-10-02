import type { DashboardResponse, GamesTimeClass } from './types';

/** An API call that returned an error status. Keeps the status so callers can tell 404 from 5xx. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/**
 * GET a JSON endpoint. The body is read defensively: a gateway timeout or a crashed route can
 * return HTML, and calling res.json() on that used to throw a confusing parse error.
 * Throws ApiRequestError for any non-2xx response.
 */
async function getJson(url: string, fallbackMessage: string): Promise<any> {
  const res = await fetch(url);
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // not JSON: keep null
  }
  if (!res.ok) throw new ApiRequestError(res.status, json?.error || fallbackMessage);
  return json;
}


export async function fetchDashboard(username: string): Promise<DashboardResponse | null> {
  const json = await getJson(`/api/dashboard?username=${encodeURIComponent(username)}`, 'Failed to load dashboard.');
  return json ?? null;
}

export async function fetchStats(username: string): Promise<unknown | null> {
  const json = await getJson(`/api/stats?username=${encodeURIComponent(username)}`, 'Failed to load stats.');
  return json?.stats ?? null;
}

export async function fetchProfile(username: string): Promise<unknown | null> {
  // Throws ApiRequestError on failure. Before, every failure returned null, so a network error
  // or a Chess.com outage was reported as "username not found".
  const json = await getJson(
    `/api/profile?username=${encodeURIComponent(username)}`,
    'Failed to load profile.'
  );
  return json?.profile ?? null;
}

export async function fetchOnlineStatus(username: string): Promise<unknown | null> {
  const json = await getJson(`/api/online-status?username=${encodeURIComponent(username)}`, 'Failed to load online status.');
  return json?.onlineStatus ?? null;
}

export async function fetchClubs(username: string): Promise<unknown | null> {
  const json = await getJson(`/api/clubs?username=${encodeURIComponent(username)}`, 'Failed to load clubs.');
  return json?.clubs ?? null;
}

export async function fetchTournaments(username: string): Promise<unknown | null> {
  const json = await getJson(`/api/tournaments?username=${encodeURIComponent(username)}`, 'Failed to load tournaments.');
  return json?.tournaments ?? null;
}

export async function fetchMatches(username: string): Promise<unknown | null> {
  const json = await getJson(`/api/matches?username=${encodeURIComponent(username)}`, 'Failed to load matches.');
  return json?.matches ?? null;
}

export async function fetchCurrentGames(username: string): Promise<unknown | null> {
  const json = await getJson(`/api/current-games?username=${encodeURIComponent(username)}`, 'Failed to load current games.');
  return json?.currentGames ?? null;
}

export function filterToMoveGames(currentGamesData: unknown, username: string): { games: unknown[] } {
  const data = currentGamesData as { games?: unknown[] } | null;
  if (!data?.games) return { games: [] };

  const myTurnGames = data.games.filter((game: unknown) => {
    const g = game as Record<string, unknown>;
    const whiteUrl = typeof g.white === 'string' ? g.white : (g.white as { url?: string })?.url;
    const blackUrl = typeof g.black === 'string' ? g.black : (g.black as { url?: string })?.url;
    const whiteUsername = (whiteUrl ?? '').split('/').pop() || '';
    const blackUsername = (blackUrl ?? '').split('/').pop() || '';
    const currentUsername = username.trim();
    const isUserWhite = whiteUsername === currentUsername;
    const isUserBlack = blackUsername === currentUsername;
    const turn = String(g.turn ?? '');
    if (isUserWhite && turn === 'white') return true;
    if (isUserBlack && turn === 'black') return true;
    return false;
  });

  return { games: myTurnGames };
}

export async function fetchGames(
  username: string,
  timeClass: GamesTimeClass,
  months: number
): Promise<{
  points: { date: string; rating: number; result: 'win' | 'loss' | 'draw' | 'other' }[];
  summary: { games: number; win: number; loss: number; draw: number };
  missingMonths: number;
} | null> {
  const json = await getJson(
    `/api/games?username=${encodeURIComponent(username)}&timeClass=${encodeURIComponent(
      timeClass
    )}&months=${encodeURIComponent(String(months))}`,
    'Failed to load games.'
  );

  return {
    points: Array.isArray(json?.points)
      ? json.points.map((p: { date?: string; rating?: number; result?: string }) => ({
          date: String(p?.date ?? ''),
          rating: Number(p?.rating ?? 0),
          result: (p?.result ?? 'other') as 'win' | 'loss' | 'draw' | 'other',
        }))
      : [],
    summary: json?.summary ?? { games: 0, win: 0, loss: 0, draw: 0 },
    missingMonths: Number(json?.missingMonths ?? 0),
  };
}

export async function fetchIngest(username: string): Promise<void> {
  await fetch(`/api/ingest?username=${encodeURIComponent(username)}`);
}
