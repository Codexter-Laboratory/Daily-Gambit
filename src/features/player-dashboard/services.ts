import type { DashboardResponse, GamesTimeClass } from './types';

export async function fetchDashboard(username: string): Promise<DashboardResponse | null> {
  const res = await fetch(`/api/dashboard?username=${encodeURIComponent(username)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load dashboard.');
  return json ?? null;
}

export async function fetchStats(username: string): Promise<unknown | null> {
  const res = await fetch(`/api/stats?username=${encodeURIComponent(username)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load stats.');
  return json?.stats ?? null;
}

export async function fetchProfile(username: string): Promise<unknown | null> {
  const res = await fetch(`/api/profile?username=${encodeURIComponent(username)}`);
  const json = await res.json();
  if (!res.ok) return null;
  return json?.profile ?? null;
}

export async function fetchOnlineStatus(username: string): Promise<unknown | null> {
  const res = await fetch(`/api/online-status?username=${encodeURIComponent(username)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load online status.');
  return json?.onlineStatus ?? null;
}

export async function fetchClubs(username: string): Promise<unknown | null> {
  const res = await fetch(`/api/clubs?username=${encodeURIComponent(username)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load clubs.');
  return json?.clubs ?? null;
}

export async function fetchTournaments(username: string): Promise<unknown | null> {
  const res = await fetch(`/api/tournaments?username=${encodeURIComponent(username)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load tournaments.');
  return json?.tournaments ?? null;
}

export async function fetchMatches(username: string): Promise<unknown | null> {
  const res = await fetch(`/api/matches?username=${encodeURIComponent(username)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load matches.');
  return json?.matches ?? null;
}

export async function fetchCurrentGames(username: string): Promise<unknown | null> {
  const res = await fetch(`/api/current-games?username=${encodeURIComponent(username)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load current games.');
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
} | null> {
  const res = await fetch(
    `/api/games?username=${encodeURIComponent(username)}&timeClass=${encodeURIComponent(
      timeClass
    )}&months=${encodeURIComponent(String(months))}`
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to load games.');

  return {
    points: Array.isArray(json?.points)
      ? json.points.map((p: { date?: string; rating?: number; result?: string }) => ({
          date: String(p?.date ?? ''),
          rating: Number(p?.rating ?? 0),
          result: (p?.result ?? 'other') as 'win' | 'loss' | 'draw' | 'other',
        }))
      : [],
    summary: json?.summary ?? { games: 0, win: 0, loss: 0, draw: 0 },
  };
}

export async function fetchIngest(username: string): Promise<void> {
  await fetch(`/api/ingest?username=${encodeURIComponent(username)}`);
}
