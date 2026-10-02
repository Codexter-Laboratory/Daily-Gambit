// Chess.com asks API clients to identify themselves with a User-Agent.
const CHESSCOM_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'PawnUp/1.0 (+https://github.com/Codexter-Laboratory/Pawn-up)',
};

export type PuzzleRushDailyStats = {
  attemptsTotal: number | null;
  scoreTotal: number | null;
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

  if (!res.ok) {
    // Surface a useful message for the UI.
    const text = await res.text().catch(() => '');
    throw new Error(
      `Chess.com PubAPI error (${res.status}) for ${username}: ${text || res.statusText}`
    );
  }

  const data = (await res.json()) as any;

  const daily = data?.tactics?.puzzle_rush?.daily;
  return {
    attemptsTotal:
      typeof daily?.total_attempts === 'number' ? daily.total_attempts : null,
    scoreTotal: typeof daily?.score === 'number' ? daily.score : null,
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

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Chess.com PubAPI error (${res.status}) for ${username}: ${text || res.statusText}`
    );
  }

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

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Chess.com PubAPI error (${res.status}) for ${username}: ${text || res.statusText}`
    );
  }

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

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Chess.com PubAPI error (${res.status}) for ${username}: ${text || res.statusText}`
    );
  }

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

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Chess.com PubAPI error (${res.status}) for ${username}: ${text || res.statusText}`
    );
  }

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

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Chess.com PubAPI error (${res.status}) for ${username}: ${text || res.statusText}`
    );
  }

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

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Chess.com PubAPI error (${res.status}) for ${username}: ${text || res.statusText}`
    );
  }

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

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Chess.com PubAPI error (${res.status}) for ${username}: ${text || res.statusText}`
    );
  }

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

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Chess.com PubAPI error (${res.status}) for ${username}: ${text || res.statusText}`
    );
  }

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

export type RatingPoint = {
  endTime: number; // unix seconds
  date: string; // YYYY-MM-DD
  rating: number;
  result: 'win' | 'loss' | 'draw' | 'other';
  color: 'white' | 'black';
  timeClass: string;
};

type ArchiveIndex = { archives?: string[] };

type ArchiveGame = {
  end_time?: number;
  time_class?: string;
  rules?: string;
  rated?: boolean;
  white?: { username?: string; rating?: number; result?: string };
  black?: { username?: string; rating?: number; result?: string };
};

function isoDateUTCFromUnixSeconds(sec: number): string {
  return new Date(sec * 1000).toISOString().slice(0, 10);
}

function normalizeResultForPlayer(playerResult?: string): RatingPoint['result'] {
  // Chess.com uses: win, checkmated, resigned, timeout, stalemate, agreed, repetition, insufficient, 50move, abandoned, etc.
  if (!playerResult) return 'other';
  if (playerResult === 'win') return 'win';
  if (
    playerResult === 'agreed' ||
    playerResult === 'repetition' ||
    playerResult === 'stalemate' ||
    playerResult === 'insufficient' ||
    playerResult === '50move' ||
    playerResult === 'timevsinsufficient'
  ) {
    return 'draw';
  }
  return 'loss';
}

function pickPlayerSide(game: ArchiveGame, username: string) {
  const u = username.toLowerCase();
  const w = game.white?.username?.toLowerCase();
  const b = game.black?.username?.toLowerCase();
  if (w === u) return { color: 'white' as const, side: game.white };
  if (b === u) return { color: 'black' as const, side: game.black };
  return null;
}

export async function fetchRatingSeriesFromArchives(params: {
  username: string;
  timeClass: GameTimeClass;
  months?: number; // lookback, newest N months
  signal?: AbortSignal;
}): Promise<{ points: RatingPoint[]; summary: { games: number; win: number; loss: number; draw: number } }> {
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
  if (!indexRes.ok) {
    const text = await indexRes.text().catch(() => '');
    throw new Error(
      `Chess.com PubAPI error (${indexRes.status}) for ${username}: ${text || indexRes.statusText}`
    );
  }
  const index = (await indexRes.json()) as ArchiveIndex;
  const archives = Array.isArray(index.archives) ? index.archives : [];
  const recentArchives = archives.slice(-Math.max(1, months));

  // Fetch archives sequentially to be gentle to PubAPI.
  const allGames: ArchiveGame[] = [];
  for (const url of recentArchives) {
    const res = await fetch(url, {
      method: 'GET',
      headers: CHESSCOM_HEADERS,
      signal,
      next: { revalidate: 60 },
    });
    if (!res.ok) continue;
    const json = (await res.json()) as any;
    const games = Array.isArray(json?.games) ? (json.games as ArchiveGame[]) : [];
    allGames.push(...games);
  }

  const points: RatingPoint[] = [];
  let win = 0;
  let loss = 0;
  let draw = 0;

  for (const g of allGames) {
    if (g.time_class !== timeClass) continue;
    if (typeof g.end_time !== 'number') continue;

    const player = pickPlayerSide(g, username);
    if (!player) continue;
    const rating = player.side?.rating;
    if (typeof rating !== 'number') continue;

    const result = normalizeResultForPlayer(player.side?.result);
    if (result === 'win') win += 1;
    else if (result === 'loss') loss += 1;
    else if (result === 'draw') draw += 1;

    points.push({
      endTime: g.end_time,
      date: isoDateUTCFromUnixSeconds(g.end_time),
      rating,
      result,
      color: player.color,
      timeClass: g.time_class ?? timeClass,
    });
  }

  points.sort((a, b) => a.endTime - b.endTime);

  return {
    points,
    summary: { games: points.length, win, loss, draw },
  };
}
