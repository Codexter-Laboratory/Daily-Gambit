import { Chess } from 'chess.js';

/** "g1f3" in a position -> "Nf3". Returns null when the move is not legal there. */
export function uciToSan(fen: string, uci: string | null): string | null {
  if (!uci || uci.length < 4) return null;
  try {
    return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined }).san;
  } catch {
    return null;
  }
}

/** Every position of a game as FEN: index 0 is the start, index n is after the n-th half-move. */
export function positionsFromSans(sans: readonly string[]): string[] {
  const chess = new Chess();
  const fens = [chess.fen()];
  for (const san of sans) {
    try {
      chess.move(san);
    } catch {
      break; // a corrupt game stops where it stops; the review shows what it can
    }
    fens.push(chess.fen());
  }
  return fens;
}
