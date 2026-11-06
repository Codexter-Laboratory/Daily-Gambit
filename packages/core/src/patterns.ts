import type { AnalyzedGame, Motif, MoveError, PieceLetter } from './types';

export const MOTIF_LABELS: Record<Motif, string> = {
  'hung-piece': 'Left a piece hanging',
  'missed-capture': 'Missed a free capture',
  'missed-mate': 'Missed a mate',
  'allowed-mate': 'Walked into a mate',
  'missed-tactic': 'Missed a tactic (check, capture or promotion)',
  positional: 'Positional or strategic',
};

export const PIECE_LABELS: Record<PieceLetter, string> = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };

const seriousErrors = (games: AnalyzedGame[]) => games.flatMap((g) => g.analysis.errors).filter((e) => e.kind !== 'inaccuracy');

export type CountRow<T extends string> = { key: T; count: number; pct: number };

function tally<T extends string>(items: T[]): CountRow<T>[] {
  const counts = new Map<T, number>();
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1);
  return [...counts]
    .map(([key, count]) => ({ key, count, pct: Math.round((count / items.length) * 100) }))
    .sort((a, b) => b.count - a.count);
}

/** What kind of mistakes you make, among mistakes and blunders. */
export const motifBreakdown = (games: AnalyzedGame[]) => tally(seriousErrors(games).map((e) => e.motif));

/** Which piece you were moving when you went wrong. */
export const pieceBreakdown = (games: AnalyzedGame[]) => tally(seriousErrors(games).map((e) => e.piece));

export type RepeatedMistake = {
  fenBefore: string;
  color: MoveError['color'];
  /** What you played each time, and what the engine wanted. */
  san: string;
  bestSan: string;
  count: number;
  avgLoss: number;
  opening: string | null;
  /** One example per game, for the review board. */
  examples: MoveError[];
};

/** The same wrong move, in the same position, in more than one game. The patterns that are costing you most. */
export function repeatedMistakes(games: AnalyzedGame[], minCount = 2): RepeatedMistake[] {
  const groups = new Map<string, MoveError[]>();
  for (const e of seriousErrors(games)) {
    // Move counters do not matter: the same position reached on a different move number is the same position.
    const key = `${e.fenBefore.split(' ').slice(0, 4).join(' ')}|${e.san}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.values()]
    .filter((list) => new Set(list.map((e) => e.gameId)).size >= minCount)
    .map((list) => ({
      fenBefore: list[0].fenBefore,
      color: list[0].color,
      san: list[0].san,
      bestSan: list[0].bestSan,
      count: list.length,
      avgLoss: Math.round(list.reduce((s, e) => s + e.winLoss, 0) / list.length),
      opening: list[0].opening,
      examples: list,
    }))
    .sort((a, b) => b.count * b.avgLoss - a.count * a.avgLoss);
}
