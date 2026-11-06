import { Chess } from 'chess.js';
import { winPercent } from './winProb';
import type { MoveError } from './types';

export type PlayedMove = { uci: string; san: string; fenAfter: string };

/** Applies a drag-and-drop move. Pawn promotions become queens. Returns null when the move is illegal. */
export function playMove(fen: string, from: string, to: string): PlayedMove | null {
  const chess = new Chess(fen);
  try {
    const piece = chess.get(from as Parameters<Chess['get']>[0]);
    const promotes = piece?.type === 'p' && (to.endsWith('8') || to.endsWith('1'));
    const move = chess.move({ from, to, promotion: promotes ? 'q' : undefined });
    return { uci: `${move.from}${move.to}${move.promotion ?? ''}`, san: move.san, fenAfter: chess.fen() };
  } catch {
    return null;
  }
}

/** Plays a move typed as SAN ("Nf3", "exd5", "O-O"). Lenient about case and check marks. Null when illegal or unreadable. */
export function playSan(fen: string, text: string): PlayedMove | null {
  const chess = new Chess(fen);
  try {
    const move = chess.move(text.trim().replace(/^0-0-0$/i, 'O-O-O').replace(/^0-0$/i, 'O-O'));
    return { uci: `${move.from}${move.to}${move.promotion ?? ''}`, san: move.san, fenAfter: chess.fen() };
  } catch {
    return null;
  }
}

export const isBestMove = (error: Pick<MoveError, 'bestUci'>, uci: string) => error.bestUci.toLowerCase() === uci.toLowerCase();

/** How much win chance a different move may give up and still count as correct. */
export const ALTERNATIVE_TOLERANCE = 5;

/**
 * The engine's best move is not the only good one. A different move counts too when, after it,
 * the player still has nearly the win chance they had before the mistake.
 * `whiteCpAfter` is the engine evaluation (White's point of view) of the position after the move.
 */
export function isAcceptableAlternative(error: Pick<MoveError, 'color' | 'winBefore'>, whiteCpAfter: number): boolean {
  const sign = error.color === 'white' ? 1 : -1;
  return winPercent(sign * whiteCpAfter) >= error.winBefore - ALTERNATIVE_TOLERANCE;
}

/** Whole-day streak: consecutive days with training, ending today or yesterday (today may still be to come). */
export function trainingStreak(days: readonly string[], today: string): number {
  const set = new Set(days);
  const shift = (iso: string, by: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + by * 86_400_000).toISOString().slice(0, 10);
  let day = set.has(today) ? today : shift(today, -1);
  let streak = 0;
  while (set.has(day)) {
    streak += 1;
    day = shift(day, -1);
  }
  return streak;
}
