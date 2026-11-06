import { isTimeTrouble } from './clock';
import type { AnalyzedGame } from './types';

const round1 = (n: number) => Math.round(n * 10) / 10;
const serious = (kind: string) => kind === 'mistake' || kind === 'blunder';

export type TimeStats = {
  /** Games that had clock data. The rest are left out of every number here. */
  games: number;
  /** Average seconds per move at different stages of the game. */
  avgSpent: { label: string; seconds: number | null }[];
  /** Share of your moves played in time trouble. */
  troublePct: number;
  /** Mistakes and blunders per 100 moves, with plenty of time and in time trouble. */
  seriousPer100: { normal: number | null; trouble: number | null };
  /** Share of your serious errors played in 2 seconds or less. */
  fastSeriousPct: number | null;
  /** Games lost because the clock ran out. */
  lostOnTime: { games: number; losses: number };
};

const BUCKETS = [
  { label: 'Moves 1–10', from: 1, to: 10 },
  { label: 'Moves 11–25', from: 11, to: 25 },
  { label: 'Move 26+', from: 26, to: Infinity },
];

export function timeStats(all: AnalyzedGame[]): TimeStats {
  const games = all.filter((g) => g.analysis.plies.some((p) => p.clock !== null));
  const spentSum = BUCKETS.map(() => ({ sum: 0, n: 0 }));
  let moves = 0;
  let troubleMoves = 0;
  const bad = { normal: { moves: 0, errors: 0 }, trouble: { moves: 0, errors: 0 } };
  let seriousTotal = 0;
  let seriousFast = 0;

  for (const { analysis } of games) {
    const mine = analysis.color === 'white' ? 0 : 1;
    analysis.plies.forEach((ply, i) => {
      if (i % 2 !== mine) return;
      const moveNumber = Math.floor(i / 2) + 1;
      moves += 1;
      const trouble = isTimeTrouble(ply.clock, analysis.info.timeControl);
      if (trouble) troubleMoves += 1;
      const group = trouble ? bad.trouble : bad.normal;
      group.moves += 1;
      if (serious(ply.kind)) {
        group.errors += 1;
        seriousTotal += 1;
        if (ply.spent !== null && ply.spent <= 2) seriousFast += 1;
      }
      if (ply.spent !== null) {
        const b = BUCKETS.findIndex((x) => moveNumber >= x.from && moveNumber <= x.to);
        spentSum[b].sum += ply.spent;
        spentSum[b].n += 1;
      }
    });
  }

  const per100 = (g: { moves: number; errors: number }) => (g.moves >= 20 ? round1((g.errors / g.moves) * 100) : null);
  const withClock = new Set(games.map((g) => g.meta.id));
  const losses = all.filter((g) => g.meta.result === 'loss' && withClock.has(g.meta.id));
  return {
    games: games.length,
    avgSpent: BUCKETS.map((b, i) => ({ label: b.label, seconds: spentSum[i].n ? round1(spentSum[i].sum / spentSum[i].n) : null })),
    troublePct: moves ? Math.round((troubleMoves / moves) * 100) : 0,
    seriousPer100: { normal: per100(bad.normal), trouble: per100(bad.trouble) },
    fastSeriousPct: seriousTotal >= 3 ? Math.round((seriousFast / seriousTotal) * 100) : null,
    lostOnTime: { games: losses.filter((g) => g.meta.ending === 'timeout').length, losses: losses.length },
  };
}
