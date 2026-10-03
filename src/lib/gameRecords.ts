/**
 * Turns raw Chess.com archive games into the compact per-game records the dashboard charts use.
 * Kept free of Next.js imports so it can be unit tested on its own.
 */

export type GameResult = 'win' | 'loss' | 'draw' | 'other';

/** How a game ended, from the point of view of the game itself (not who won). */
export type GameEnding =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'abandonment'
  | 'agreement'
  | 'repetition'
  | 'stalemate'
  | 'insufficient'
  | '50move'
  | 'timevsinsufficient'
  | 'other';

export type ArchiveSide = { username?: string; rating?: number; result?: string };

export type ArchiveGame = {
  end_time?: number;
  time_class?: string;
  rules?: string;
  rated?: boolean;
  eco?: string;
  accuracies?: { white?: number; black?: number };
  white?: ArchiveSide;
  black?: ArchiveSide;
};

const DRAW_CODES = new Set(['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient']);

export function normalizeResultForPlayer(playerResult?: string): GameResult {
  // Chess.com uses: win, checkmated, resigned, timeout, stalemate, agreed, repetition, insufficient, 50move, abandoned, etc.
  if (!playerResult) return 'other';
  if (playerResult === 'win') return 'win';
  if (DRAW_CODES.has(playerResult)) return 'draw';
  return 'loss';
}

const ENDING_BY_CODE: Record<string, GameEnding> = {
  checkmated: 'checkmate',
  resigned: 'resignation',
  timeout: 'timeout',
  abandoned: 'abandonment',
  agreed: 'agreement',
  repetition: 'repetition',
  stalemate: 'stalemate',
  insufficient: 'insufficient',
  '50move': '50move',
  timevsinsufficient: 'timevsinsufficient',
};

/**
 * The winner's result is always "win", so for a win the way the game ended is on the loser's
 * side (checkmated, resigned, timeout, ...). For a loss or a draw it is on the player's own side.
 */
export function gameEnding(playerResult?: string, opponentResult?: string): GameEnding {
  const code = playerResult === 'win' ? opponentResult : playerResult;
  return (code && ENDING_BY_CODE[code]) || 'other';
}

const FAMILY_KEYWORDS = new Set(['Defense', 'Defence', 'Opening', 'Gambit', 'Game', 'Attack', 'System']);

const NAME_FIXES: [RegExp, string][] = [
  [/\bQueens\b/g, "Queen's"],
  [/\bKings\b/g, "King's"],
  [/\bBirds\b/g, "Bird's"],
  [/\bBishops\b/g, "Bishop's"],
  [/\bOwens\b/g, "Owen's"],
  [/\bPetrovs\b/g, "Petrov's"],
  [/\bAlekhines\b/g, "Alekhine's"],
  [/\bLarsens\b/g, "Larsen's"],
  [/\bCaro Kann\b/g, 'Caro-Kann'],
  [/\bNimzo Indian\b/g, 'Nimzo-Indian'],
  [/\bBogo Indian\b/g, 'Bogo-Indian'],
  [/\bNimzo Larsen\b/g, 'Nimzo-Larsen'],
];

/**
 * Chess.com links each game to an opening page, e.g.
 * https://www.chess.com/openings/Sicilian-Defense-Old-Sicilian-Variation-3.Nc3
 * Returns the opening family ("Sicilian Defense"), so variations group together.
 */
export function openingFamily(ecoUrl?: string): string | null {
  if (!ecoUrl) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(new URL(ecoUrl).pathname.split('/').filter(Boolean).pop() ?? '');
  } catch {
    return null;
  }
  // Drop the move sequence: "...-Variation-3.Nc3" or "...-4...Nf6".
  slug = slug.replace(/-\d+\.{1,3}.*$/, '');
  const words = slug.split('-').filter(Boolean);
  if (words.length === 0) return null;

  const keywordAt = words.findIndex((w) => FAMILY_KEYWORDS.has(w));
  const family = (keywordAt >= 0 ? words.slice(0, keywordAt + 1) : words.slice(0, 3)).join(' ');
  return NAME_FIXES.reduce((name, [re, fixed]) => name.replace(re, fixed), family);
}

export type GameRecord = {
  endTime: number; // unix seconds
  date: string; // YYYY-MM-DD (UTC)
  rating: number;
  opponentRating: number | null;
  result: GameResult;
  ending: GameEnding;
  color: 'white' | 'black';
  timeClass: string;
  opening: string | null;
  /** The player's accuracy, only present for games that were analysed on Chess.com. */
  accuracy: number | null;
};

/** Builds the record for `username`'s side of a game, or null if they did not play in it. */
export function toGameRecord(game: ArchiveGame, username: string, fallbackTimeClass: string): GameRecord | null {
  if (typeof game.end_time !== 'number') return null;

  const u = username.toLowerCase();
  let color: 'white' | 'black';
  if (game.white?.username?.toLowerCase() === u) color = 'white';
  else if (game.black?.username?.toLowerCase() === u) color = 'black';
  else return null;

  const me = color === 'white' ? game.white : game.black;
  const opponent = color === 'white' ? game.black : game.white;
  if (typeof me?.rating !== 'number') return null;

  const accuracy = game.accuracies?.[color];
  return {
    endTime: game.end_time,
    date: new Date(game.end_time * 1000).toISOString().slice(0, 10),
    rating: me.rating,
    opponentRating: typeof opponent?.rating === 'number' ? opponent.rating : null,
    result: normalizeResultForPlayer(me.result),
    ending: gameEnding(me.result, opponent?.result),
    color,
    timeClass: game.time_class ?? fallbackTimeClass,
    opening: openingFamily(game.eco),
    accuracy: typeof accuracy === 'number' && Number.isFinite(accuracy) ? accuracy : null,
  };
}
