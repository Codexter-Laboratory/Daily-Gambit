import type { MoveKind, UciScore } from './types';

/** A forced mate is worth this many centipawns. Large enough to saturate the win-chance curve. */
export const MATE_CP = 10_000;

/**
 * Win chance (0-100) for the side the centipawn score favours when positive.
 * Same logistic curve Lichess uses, fitted on real games.
 */
export function winPercent(cp: number): number {
  const clamped = Math.max(-1000, Math.min(1000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

/** Accuracy (0-100) of a single move, from the win chance it gave away. */
export function moveAccuracy(winLoss: number): number {
  const raw = 103.1668 * Math.exp(-0.04354 * Math.max(0, winLoss)) - 3.1669;
  return Math.max(0, Math.min(100, raw));
}

/** How bad a move was, by win chance lost (percentage points). Lichess uses the same bands. */
export function classifyLoss(winLoss: number): MoveKind {
  if (winLoss >= 30) return 'blunder';
  if (winLoss >= 20) return 'mistake';
  if (winLoss >= 10) return 'inaccuracy';
  return 'ok';
}

/**
 * UCI reports scores from the point of view of the side to move. Everything else in the app
 * uses White's point of view, so this is the one place that converts.
 */
export function toWhiteCp(score: UciScore, sideToMove: 'w' | 'b'): number {
  const sideCp = 'mate' in score ? (score.mate === 0 ? -MATE_CP : Math.sign(score.mate) * MATE_CP) : score.cp;
  return sideToMove === 'w' ? sideCp : -sideCp;
}
