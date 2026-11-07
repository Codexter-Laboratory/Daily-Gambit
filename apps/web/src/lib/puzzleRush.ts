/**
 * Chess.com's published /stats shape lists `puzzle_rush` at the top level, next to `tactics`.
 * Older code here read `tactics.puzzle_rush`, which would always be empty. Read the documented
 * location first and fall back to the old one so either shape works.
 */
type RushBlock = {
  best?: { total_attempts?: unknown; score?: unknown };
  daily?: { total_attempts?: unknown; score?: unknown };
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export type PuzzleRushNumbers = {
  dailyAttempts: number | null;
  dailyScore: number | null;
  bestScore: number | null;
};

export function extractPuzzleRush(stats: unknown): PuzzleRushNumbers {
  const s = (stats ?? {}) as { puzzle_rush?: RushBlock; tactics?: { puzzle_rush?: RushBlock } };
  const rush = s.puzzle_rush ?? s.tactics?.puzzle_rush;
  return {
    dailyAttempts: num(rush?.daily?.total_attempts),
    dailyScore: num(rush?.daily?.score),
    bestScore: num(rush?.best?.score),
  };
}
