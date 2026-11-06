import { Chess, type Move } from 'chess.js';
import { MATE_CP } from './winProb';
import type { Motif } from './types';

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * The most material the side to move can win with a single capture, counting whether the
 * capturing piece would be recaptured. A rough static exchange, enough to spot hanging pieces.
 */
export function biggestFreeCapture(fen: string): number {
  const chess = new Chess(fen);
  let best = 0;
  for (const m of chess.moves({ verbose: true }) as Move[]) {
    if (!m.captured) continue;
    const victim = VALUE[m.captured];
    chess.move(m.san);
    const recaptured = chess.moves({ verbose: true }).some((r) => r.captured && r.to === m.to);
    chess.undo();
    best = Math.max(best, recaptured ? victim - VALUE[m.piece] : victim);
  }
  return best;
}

export type MotifInput = {
  fenBefore: string;
  fenAfter: string;
  /** What the player played. */
  played: { piece: string; captured?: string };
  bestUci: string;
  /** Centipawns from the player's point of view, before and after the move. */
  cpBefore: number;
  cpAfter: number;
};

/** Names what went wrong. Checked in order, so a missed mate is never reported as a "positional" error. */
export function detectMotif(input: MotifInput): Motif {
  if (input.cpAfter <= -MATE_CP) return 'allowed-mate';
  if (input.cpBefore >= MATE_CP) return 'missed-mate';
  if (biggestFreeCapture(input.fenAfter) >= 3) return 'hung-piece';

  try {
    const chess = new Chess(input.fenBefore);
    const best = chess.move({ from: input.bestUci.slice(0, 2), to: input.bestUci.slice(2, 4), promotion: input.bestUci[4] });
    if (best.captured && VALUE[best.captured] >= 3 && !input.played.captured) return 'missed-capture';
    if (best.captured || best.promotion || best.san.includes('+')) return 'missed-tactic';
  } catch {
    // An unreadable best move just means we cannot say more than "positional".
  }
  return 'positional';
}
