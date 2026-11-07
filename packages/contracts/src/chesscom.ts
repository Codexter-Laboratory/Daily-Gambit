import type { GameRecord } from '@daily-gambit/core';

/** Shapes of the Chess.com public API responses that the app reads. Only the fields we use are listed. */

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

export type OnlineStatus = { online: boolean };

export type PlayerClub = {
  '@id': string;
  name: string;
  last_activity: number;
  icon: string;
  url: string;
  joined: number;
};
export type PlayerClubsResponse = { clubs: PlayerClub[] };

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

export type PlayerMatch = {
  name: string;
  url: string;
  '@id': string;
  club: string;
  results?: { played_as_white: string; played_as_black: string };
  board?: string;
};
export type PlayerMatchesResponse = {
  finished: PlayerMatch[];
  in_progress: PlayerMatch[];
  registered: PlayerMatch[];
};

export type CurrentGame = {
  url: string;
  white: { username: string; rating?: number; result?: string; url: string };
  black: { username: string; rating?: number; result?: string; url: string };
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
export type CurrentGamesResponse = { games: CurrentGame[] };

/** Chess.com stats are a large object keyed by game type. The app reads them defensively. */
export type ChessComStats = Record<string, unknown>;

/** Standard time controls plus the variants Chess.com lists as separate ratings. */
export const GAME_CATEGORIES = ['bullet', 'blitz', 'rapid', 'daily', 'chess960', 'bughouse', 'crazyhouse', 'kingofthehill', 'threecheck', 'atomic'] as const;
export type GameCategory = (typeof GAME_CATEGORIES)[number];
export const MAX_MONTHS = 36;

/** One game from the player's side; the games charts are all built from these. */
export type GamesSeries = {
  username: string;
  timeClass: GameCategory;
  months: number;
  points: GameRecord[];
  summary: { games: number; win: number; loss: number; draw: number };
  /** Months of the lookback that could not be loaded. 0 means the data is complete. */
  missingMonths: number;
};

// Responses of GET /v1/players/:username/...
export type ProfileResponse = { username: string; profile: PlayerProfile };
export type StatsResponse = { username: string; stats: ChessComStats };
export type ClubsResponse = { username: string; clubs: PlayerClubsResponse };
export type TournamentsResponse = { username: string; tournaments: PlayerTournamentsResponse };
export type MatchesResponse = { username: string; matches: PlayerMatchesResponse };
export type CurrentGamesPayload = { username: string; currentGames: CurrentGamesResponse };
