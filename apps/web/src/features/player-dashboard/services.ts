import type {
  ClubsResponse,
  CurrentGamesPayload,
  GamesSeries,
  MatchesResponse,
  PlayerProfile,
  ProfileResponse,
  StatsResponse,
  TournamentsResponse,
} from '@daily-gambit/contracts';
import { ApiRequestError, apiRequest, withFresh } from '../../lib/api';
import type { GamesTimeClass } from './types';

export { ApiRequestError };

type Options = { fresh?: boolean };

const player = (username: string, path: string) => `/v1/players/${encodeURIComponent(username)}${path}`;

// Every fetcher throws ApiRequestError on failure, so a network error or a Chess.com outage is
// never mistaken for "username not found".
export async function fetchStats(username: string, { fresh }: Options = {}) {
  return (await apiRequest<StatsResponse>(withFresh(player(username, '/stats'), fresh))).stats;
}

export async function fetchProfile(username: string, { fresh }: Options = {}): Promise<PlayerProfile> {
  return (await apiRequest<ProfileResponse>(withFresh(player(username, '/profile'), fresh))).profile;
}

export async function fetchClubs(username: string, { fresh }: Options = {}) {
  return (await apiRequest<ClubsResponse>(withFresh(player(username, '/clubs'), fresh))).clubs;
}

export async function fetchTournaments(username: string, { fresh }: Options = {}) {
  return (await apiRequest<TournamentsResponse>(withFresh(player(username, '/tournaments'), fresh))).tournaments;
}

export async function fetchMatches(username: string, { fresh }: Options = {}) {
  return (await apiRequest<MatchesResponse>(withFresh(player(username, '/matches'), fresh))).matches;
}

export async function fetchCurrentGames(username: string, { fresh }: Options = {}) {
  return (await apiRequest<CurrentGamesPayload>(withFresh(player(username, '/current-games'), fresh))).currentGames;
}

/** The games behind the rating, activity and results charts. */
export async function fetchGames(username: string, timeClass: GamesTimeClass, months: number, { fresh }: Options = {}): Promise<GamesSeries> {
  return apiRequest<GamesSeries>(withFresh(`${player(username, '/games')}?timeClass=${encodeURIComponent(timeClass)}&months=${months}`, fresh));
}

/** The games where it is the given player's turn to move. */
export function filterToMoveGames(currentGamesData: unknown, username: string): { games: unknown[] } {
  const data = currentGamesData as { games?: unknown[] } | null;
  if (!data?.games) return { games: [] };

  const me = username.trim().toLowerCase();
  const lastSegment = (value: unknown): string => {
    const url = typeof value === 'string' ? value : (value as { url?: string } | undefined)?.url;
    return (url ?? '').split('/').pop()?.toLowerCase() ?? '';
  };

  return {
    games: data.games.filter((game) => {
      const g = game as Record<string, unknown>;
      const turn = String(g.turn ?? '');
      return (lastSegment(g.white) === me && turn === 'white') || (lastSegment(g.black) === me && turn === 'black');
    }),
  };
}
