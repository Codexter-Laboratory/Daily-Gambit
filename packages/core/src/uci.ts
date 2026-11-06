import type { UciScore } from './types';

export type UciInfo = { depth: number; score: UciScore };

/**
 * Reads one UCI `info` line. Returns null for lines without a final score: other info lines,
 * and "lowerbound" / "upperbound" scores, which are not the engine's settled answer yet.
 */
export function parseInfoLine(line: string): UciInfo | null {
  if (!line.startsWith('info ') || /\b(lowerbound|upperbound)\b/.test(line)) return null;
  const depth = /\bdepth (\d+)/.exec(line);
  const cp = /\bscore cp (-?\d+)/.exec(line);
  const mate = /\bscore mate (-?\d+)/.exec(line);
  if (!depth || (!cp && !mate)) return null;
  return { depth: Number(depth[1]), score: cp ? { cp: Number(cp[1]) } : { mate: Number(mate![1]) } };
}

/** "bestmove e2e4 ponder e7e5" -> "e2e4". "bestmove (none)" -> null. Not a bestmove line -> undefined. */
export function parseBestMove(line: string): string | null | undefined {
  if (!line.startsWith('bestmove')) return undefined;
  const move = line.split(/\s+/)[1];
  return move && move !== '(none)' ? move : null;
}
