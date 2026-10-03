import { extractPuzzleRush } from './puzzleRush';
import { toGameRecord, type ArchiveGame, type GameRecord } from './gameRecords';

// Chess.com asks API clients to identify themselves with a User-Agent.
const CHESSCOM_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'DailyGambit/1.0 (+https://github.com/Codexter-Laboratory/Daily-Gambit)',
};

/** An error from Chess.com that keeps the HTTP status, so routes can answer 404 vs 502 correctly. */
export class ChessComApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ChessComApiError';
  }
}

async function chessComError(res: Response, username: string): Promise<ChessComApiError> {
  const text = await res.text().catch(() => '');
  return new ChessComApiError(
    res.status,
    `Chess.com PubAPI error (${res.status}) for ${username}: ${text || res.statusText}`
  );
}

export type PuzzleRushDailyStats = {
  attemptsTotal: number | null;
  scoreTotal: number | null;
  /** Best single run. Chess.com returns this even when the daily block is missing. */
  bestScore: number | null;
};

export type ChessComStatsResponse = Record<string, unknown>;

// Player Profile types
export type PlayerProfile = {
  '@id': string;
  url: string;
  username: string;
  player_id: number;
  title?: string;
  status: 'closed' | 'closed:fair_play_violations' | 'basic' | 'premium' | 'mod' | 'staff';
  name?: string;
  avatar?: string;
  location?: string;
  country: string;
  joined: number;
  last_online: number;
  followers: number;
  is_streamer: boolean;
  twitch_url?: string;
  fide?: number;
};

// Online Status types
export type OnlineStatus = {
  online: boolean;
};

// Clubs types
export type PlayerClub = {
  '@id': string;
  name: string;
  last_activity: number;
  icon: string;
  url: string;
  joined: number;
};

export type PlayerClubsResponse = {
  clubs: PlayerClub[];
};

// Tournaments types
export type PlayerTournament = {
  url: string;
  '@id': string;
  wins?: number;
  losses?: number;
  draws?: number;
  points_awarded?: number;
  placement?: number;
  status: 'winner' | 'eliminated' | 'withdrew' | 'removed' | 'invited' | 'registered';
  total_players?: number;
};

export type PlayerTournamentsResponse = {
  finished: PlayerTournament[];
  in_progress: PlayerTournament[];
  registered: PlayerTournament[];
};

// Matches types
export type PlayerMatch = {
  name: string;
  url: string;
  '@id': string;
  club: string;
  results?: {
    played_as_white: string;
    played_as_black: string;
  };
  board?: string;
};

export type PlayerMatchesResponse = {
  finished: PlayerMatch[];
  in_progress: PlayerMatch[];
  registered: PlayerMatch[];
};

// Current Games types
export type CurrentGame = {
  url: string;
  white: {
    username: string;
    rating?: number;
    result?: string;
    url: string;
  };
  black: {
    username: string;
    rating?: number;
    result?: string;
    url: string;
  };
  fen: string;
  pgn: string;
  turn: 'white' | 'black';
  move_by: number;
  draw_offer?: 'white' | 'black';
  last_activity: number;
  start_time?: number;
  time_control: string;
  time_class: string;
  rules: string;
  tournament?: string;
  match?: string;
};

export type CurrentGamesResponse = {
  games: CurrentGame[];
};

// To-Move Games types
export type ToMoveGame = {
  url: string;
  move_by: number;
  draw_offer?: boolean;
  last_activity: number;
};

export type ToMoveGamesResponse = {
  games: ToMoveGame[];
};

export async function fetchPuzzleRushDailyStats(
  username: string,
  signal?: AbortSignal
): Promise<PuzzleRushDailyStats> {
  const url = `https://api.chess.com/pub/player/${encodeURIComponent(
    username
  )}/stats`;

  const res = await fetch(url, {
    method: 'GET',
    headers: CHESSCOM_HEADERS,
    signal,
  });

  if (!res.ok) throw await chessComError(res, username);

  const rush = extractPuzzleRush(await res.json());
  return {
    attemptsTotal: rush.dailyAttempts,
    scoreTotal: rush.dailyScore,
    bestScore: rush.bestScore,
  };
}

export async function fetchPlayerProfile(
  username: string,
  signal?: AbortSignal
): Promise<PlayerProfile> {
  const url = `https://api.chess.com/pub/player/${encodeURIComponent(
    username
  )}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: CHESSCOM_HEADERS,
    signal,
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!res.ok) throw await chessComError(res, username);

  return (await res.json()) as PlayerProfile;
}

export async function fetchPlayerOnlineStatus(
  username: string,
  signal?: AbortSignal
): Promise<OnlineStatus> {
  const url = `https://api.chess.com/pub/player/${encodeURIComponent(
    username
  )}/is-online`;

  const res = await fetch(url, {
    method: 'GET',
    headers: CHESSCOM_HEADERS,
    signal,
    next: { revalidate: 60 }, // Cache for 1 minute
  });

  if (!res.ok) throw await chessComError(res, username);

  return (await res.json()) as OnlineStatus;
}

export async function fetchPlayerClubs(
  username: string,
  signal?: AbortSignal
): Promise<PlayerClubsResponse> {
  const url = `https://api.chess.com/pub/player/${encodeURIComponent(
    username
  )}/clubs`;

  const res = await fetch(url, {
    method: 'GET',
    headers: CHESSCOM_HEADERS,
    signal,
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!res.ok) throw await chessComError(res, username);

  return (await res.json()) as PlayerClubsResponse;
}

export async function fetchPlayerTournaments(
  username: string,
  signal?: AbortSignal
): Promise<PlayerTournamentsResponse> {
  const url = `https://api.chess.com/pub/player/${encodeURIComponent(
    username
  )}/tournaments`;

  const res = await fetch(url, {
    method: 'GET',
    headers: CHESSCOM_HEADERS,
    signal,
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!res.ok) throw await chessComError(res, username);

  return (await res.json()) as PlayerTournamentsResponse;
}

export async function fetchPlayerMatches(
  username: string,
  signal?: AbortSignal
): Promise<PlayerMatchesResponse> {
  const url = `https://api.chess.com/pub/player/${encodeURIComponent(
    username
  )}/matches`;

  const res = await fetch(url, {
    method: 'GET',
    headers: CHESSCOM_HEADERS,
    signal,
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!res.ok) throw await chessComError(res, username);

  return (await res.json()) as PlayerMatchesResponse;
}

export async function fetchCurrentGames(
  username: string,
  signal?: AbortSignal
): Promise<CurrentGamesResponse> {
  const url = `https://api.chess.com/pub/player/${encodeURIComponent(
    username
  )}/games`;

  const res = await fetch(url, {
    method: 'GET',
    headers: CHESSCOM_HEADERS,
    signal,
    next: { revalidate: 60 }, // Cache for 1 minute
  });

  if (!res.ok) throw await chessComError(res, username);

  return (await res.json()) as CurrentGamesResponse;
}

export async function fetchToMoveGames(
  username: string,
  signal?: AbortSignal
): Promise<ToMoveGamesResponse> {
  const url = `https://api.chess.com/pub/player/${encodeURIComponent(
    username
  )}/games/to-move`;

  const res = await fetch(url, {
    method: 'GET',
    headers: CHESSCOM_HEADERS,
    signal,
    next: { revalidate: 60 }, // Cache for 1 minute
  });

  if (!res.ok) throw await chessComError(res, username);

  return (await res.json()) as ToMoveGamesResponse;
}

export async function fetchPlayerStats(
  username: string,
  signal?: AbortSignal
): Promise<ChessComStatsResponse> {
  const url = `https://api.chess.com/pub/player/${encodeURIComponent(
    username
  )}/stats`;
  const res = await fetch(url, {
    method: 'GET',
    headers: CHESSCOM_HEADERS,
    signal,
    // Keep it reasonably fresh but avoid hammering PubAPI.
    next: { revalidate: 60 },
  });

  if (!res.ok) throw await chessComError(res, username);

  return (await res.json()) as ChessComStatsResponse;
}

export type GameTimeClass =
  | 'bullet'
  | 'blitz'
  | 'rapid'
  | 'daily'
  | 'chess960'
  | 'bughouse'
  | 'crazyhouse'
  | 'kingofthehill'
  | 'threecheck'
  | 'atomic';

/** One game from the player's side; the charts are all built from these. */
export type RatingPoint = GameRecord;

type ArchiveIndex = { archives?: string[] };

const ARCHIVE_CONCURRENCY = 4;
const STANDARD_TIME_CLASSES = new Set(['bullet', 'blitz', 'rapid', 'daily']);

/**
 * Which games belong to the selected category?
 *  - bullet / blitz / rapid / daily are standard chess: time_class matches AND the game is
 *    not a variant. Chess.com puts the variant in `rules` (crazyhouse, chess960, ...), and a
 *    variant game also has a time_class like "blitz", so without this check variant ratings
 *    were mixed into the standard rating curve.
 *  - chess960, crazyhouse, kingofthehill, ... are variants: they live in `rules`, not in
 *    time_class, so filtering on time_class alone always returned zero games.
 */
function matchesCategory(game: ArchiveGame, category: GameTimeClass): boolean {
  if (STANDARD_TIME_CLASSES.has(category)) {
    return game.time_class === category && (game.rules ?? 'chess') === 'chess';
  }
  return game.rules === category || game.time_class === category;
}

/** Runs fn over items with at most `limit` in flight, keeping the results in input order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** One monthly archive. Retries once on 429/5xx/network errors. null means it could not be loaded. */
async function fetchArchive(url: string, signal?: AbortSignal): Promise<ArchiveGame[] | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: CHESSCOM_HEADERS,
        signal,
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const json = (await res.json()) as { games?: ArchiveGame[] };
        return Array.isArray(json?.games) ? json.games : [];
      }
      if (res.status !== 429 && res.status < 500) return null; // retrying will not help
    } catch (e) {
      if (signal?.aborted) throw e;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

export async function fetchRatingSeriesFromArchives(params: {
  username: string;
  timeClass: GameTimeClass;
  months?: number; // lookback, newest N months
  signal?: AbortSignal;
}): Promise<{
  points: RatingPoint[];
  summary: { games: number; win: number; loss: number; draw: number };
  /** Months of the lookback whose archive could not be loaded. 0 means the data is complete. */
  missingMonths: number;
}> {
  const { username, timeClass, months = 6, signal } = params;

  const indexUrl = `https://api.chess.com/pub/player/${encodeURIComponent(
    username
  )}/games/archives`;
  const indexRes = await fetch(indexUrl, {
    method: 'GET',
    headers: CHESSCOM_HEADERS,
    signal,
    next: { revalidate: 60 },
  });
  if (!indexRes.ok) throw await chessComError(indexRes, username);
  const index = (await indexRes.json()) as ArchiveIndex;
  const archives = Array.isArray(index.archives) ? index.archives : [];
  const recentArchives = archives.slice(-Math.max(1, months));

  // A few archives at a time: much faster than one by one (24 months used to run in series and
  // could hit the serverless time limit), and still gentle on PubAPI.
  const results = await mapLimit(recentArchives, ARCHIVE_CONCURRENCY, (url) => fetchArchive(url, signal));
  const allGames: ArchiveGame[] = [];
  let missingMonths = 0;
  for (const games of results) {
    if (games === null) missingMonths += 1;
    else allGames.push(...games);
  }
  // Every month failed: report an error instead of an empty chart that says "no games".
  if (recentArchives.length > 0 && missingMonths === recentArchives.length) {
    throw new ChessComApiError(502, `Chess.com PubAPI error (502) for ${username}: no game archive could be loaded`);
  }

  const points: RatingPoint[] = [];
  let win = 0;
  let loss = 0;
  let draw = 0;

  for (const g of allGames) {
    if (!matchesCategory(g, timeClass)) continue;
    const record = toGameRecord(g, username, timeClass);
    if (!record) continue;

    if (record.result === 'win') win += 1;
    else if (record.result === 'loss') loss += 1;
    else if (record.result === 'draw') draw += 1;
    points.push(record);
  }

  points.sort((a, b) => a.endTime - b.endTime);

  return {
    points,
    summary: { games: points.length, win, loss, draw },
    missingMonths,
  };
}
