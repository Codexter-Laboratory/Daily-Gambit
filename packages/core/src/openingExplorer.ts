import { winPercent } from './winProb';
import type { AnalyzedGame, Side } from './types';

export type ExplorerMove = {
  san: string;
  /** Games that went through this move. */
  games: number;
  /** Your score in those games, 0-100: a win is 1, a draw is ½. */
  scorePct: number;
  /** Average win chance for you right after this move, from the engine. */
  avgWinPct: number;
  /** Games where this move was a mistake or blunder (by whoever played it). */
  seriousErrors: number;
  /** True when this is your own move, false when it is your opponent's reply. */
  byYou: boolean;
};

export type ExplorerNode = {
  path: string[];
  games: number;
  scorePct: number;
  /** Whose turn it is at this point. */
  turn: Side;
  moves: ExplorerMove[];
};

const points = (r: string) => (r === 'win' ? 1 : r === 'draw' ? 0.5 : 0);

/**
 * A move tree built from your own games, as one colour. `path` is the moves played so far.
 * Shows what you play, what opponents answer, how it scored and where mistakes cluster.
 */
export function openingExplorer(games: AnalyzedGame[], color: Side, path: string[] = []): ExplorerNode {
  const mine = games.filter((g) => g.analysis.color === color && path.every((san, i) => g.analysis.plies[i]?.san === san));
  const turn: Side = path.length % 2 === 0 ? 'white' : 'black';
  const sign = color === 'white' ? 1 : -1;

  const bySan = new Map<string, AnalyzedGame[]>();
  for (const g of mine) {
    const ply = g.analysis.plies[path.length];
    if (ply) bySan.set(ply.san, [...(bySan.get(ply.san) ?? []), g]);
  }

  const moves: ExplorerMove[] = [...bySan].map(([san, list]) => ({
    san,
    games: list.length,
    scorePct: Math.round((list.reduce((s, g) => s + points(g.meta.result), 0) / list.length) * 100),
    avgWinPct: Math.round(list.reduce((s, g) => s + winPercent(sign * g.analysis.evals[path.length + 1]), 0) / list.length),
    seriousErrors: list.filter((g) => ['mistake', 'blunder'].includes(g.analysis.plies[path.length].kind)).length,
    byYou: turn === color,
  }));
  moves.sort((a, b) => b.games - a.games || a.san.localeCompare(b.san));

  return {
    path,
    games: mine.length,
    scorePct: mine.length ? Math.round((mine.reduce((s, g) => s + points(g.meta.result), 0) / mine.length) * 100) : 0,
    turn,
    moves,
  };
}
