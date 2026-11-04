import type { AnalyzedGame, MoveError, Phase, Side } from './types';

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export type Summary = {
  games: number;
  avgAccuracy: number;
  win: number;
  draw: number;
  loss: number;
  /** Average errors per game. */
  perGame: { inaccuracy: number; mistake: number; blunder: number };
  totals: { inaccuracy: number; mistake: number; blunder: number };
};

export function summarize(games: AnalyzedGame[]): Summary {
  const totals = { inaccuracy: 0, mistake: 0, blunder: 0 };
  let win = 0;
  let draw = 0;
  let loss = 0;
  for (const { meta, analysis } of games) {
    totals.inaccuracy += analysis.counts.inaccuracy;
    totals.mistake += analysis.counts.mistake;
    totals.blunder += analysis.counts.blunder;
    if (meta.result === 'win') win += 1;
    else if (meta.result === 'draw') draw += 1;
    else if (meta.result === 'loss') loss += 1;
  }
  const n = games.length || 1;
  return {
    games: games.length,
    avgAccuracy: round1(mean(games.map((g) => g.analysis.accuracy))),
    win,
    draw,
    loss,
    perGame: { inaccuracy: round1(totals.inaccuracy / n), mistake: round1(totals.mistake / n), blunder: round1(totals.blunder / n) },
    totals,
  };
}

export type PhaseRow = { phase: Phase; moves: number; inaccuracy: number; mistake: number; blunder: number; errorsPer100: number };

/** Where in the game the errors happen. `errorsPer100` counts mistakes and blunders per 100 moves. */
export function phaseBreakdown(games: AnalyzedGame[]): PhaseRow[] {
  const phases: Phase[] = ['opening', 'middlegame', 'endgame'];
  return phases.map((phase) => {
    const row = { phase, moves: 0, inaccuracy: 0, mistake: 0, blunder: 0, errorsPer100: 0 };
    for (const { analysis } of games) {
      const p = analysis.byPhase[phase];
      row.moves += p.moves;
      row.inaccuracy += p.inaccuracy;
      row.mistake += p.mistake;
      row.blunder += p.blunder;
    }
    row.errorsPer100 = row.moves ? round1(((row.mistake + row.blunder) / row.moves) * 100) : 0;
    return row;
  });
}

export type OpeningRow = {
  opening: string;
  color: Side;
  games: number;
  /** Points scored, 0-100: a win is 1, a draw is ½. */
  scorePct: number;
  avgAccuracy: number;
  /** Mistakes and blunders made inside the opening phase, per game. */
  openingErrorsPerGame: number;
  /** Mistakes and blunders in the whole game, per game. */
  errorsPerGame: number;
  /** Cheapest way to rank leaks: how many points below 50 the score is, times games played. */
  cost: number;
};

/** One row per opening and colour. Sorted so the costliest leak comes first. */
export function openingReport(games: AnalyzedGame[], minGames = 2): OpeningRow[] {
  const groups = new Map<string, AnalyzedGame[]>();
  for (const g of games) {
    const key = `${g.analysis.opening ?? 'Unknown opening'}|${g.meta.color}`;
    groups.set(key, [...(groups.get(key) ?? []), g]);
  }
  const rows: OpeningRow[] = [];
  for (const [key, list] of groups) {
    if (list.length < minGames) continue;
    const [opening, color] = key.split('|') as [string, Side];
    const points = list.reduce((s, g) => s + (g.meta.result === 'win' ? 1 : g.meta.result === 'draw' ? 0.5 : 0), 0);
    const scorePct = Math.round((points / list.length) * 100);
    const errs = (g: AnalyzedGame) => g.analysis.counts.mistake + g.analysis.counts.blunder;
    const openingErrs = (g: AnalyzedGame) => g.analysis.byPhase.opening.mistake + g.analysis.byPhase.opening.blunder;
    rows.push({
      opening,
      color,
      games: list.length,
      scorePct,
      avgAccuracy: round1(mean(list.map((g) => g.analysis.accuracy))),
      openingErrorsPerGame: round1(mean(list.map(openingErrs))),
      errorsPerGame: round1(mean(list.map(errs))),
      cost: Math.round(Math.max(0, 50 - scorePct) * list.length),
    });
  }
  return rows.sort((a, b) => b.cost - a.cost || b.games - a.games);
}

export type TrendPoint = { id: string; date: string; accuracy: number; errors: number };

/** Oldest first, for the accuracy trend chart. */
export function accuracyTrend(games: AnalyzedGame[]): TrendPoint[] {
  return [...games]
    .sort((a, b) => a.meta.endTime - b.meta.endTime)
    .map(({ meta, analysis }) => ({
      id: meta.id,
      date: new Date(meta.endTime * 1000).toISOString().slice(0, 10),
      accuracy: analysis.accuracy,
      errors: analysis.counts.mistake + analysis.counts.blunder,
    }));
}

/** Insights shown at the top of the page: plain sentences about the single biggest fixes. */
export function topInsights(games: AnalyzedGame[]): string[] {
  if (games.length < 3) return [];
  const out: string[] = [];
  const phases = phaseBreakdown(games).filter((p) => p.moves >= 20);
  const worstPhase = [...phases].sort((a, b) => b.errorsPer100 - a.errorsPer100)[0];
  if (worstPhase && worstPhase.errorsPer100 > 0) {
    out.push(`Most of your serious errors come in the ${worstPhase.phase}: ${worstPhase.errorsPer100} per 100 moves.`);
  }
  const leak = openingReport(games).find((o) => o.cost > 0);
  if (leak) {
    out.push(`${leak.opening} as ${leak.color === 'white' ? 'White' : 'Black'} is your costliest opening: ${leak.scorePct}% over ${leak.games} games.`);
  }
  const s = summarize(games);
  if (s.perGame.blunder >= 0.5) {
    out.push(`You blunder about once every ${round1(1 / s.perGame.blunder)} games. Fixing those is the fastest rating gain.`);
  }
  return out.slice(0, 3);
}

// ---------- Daily Blunder Deck ----------

/** Small seeded PRNG, so the same day always gives the same deck. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const puzzleId = (e: Pick<MoveError, 'gameId' | 'ply'>) => `${e.gameId}:${e.ply}`;

/**
 * Today's puzzles: the biggest mistakes from your own games, at most two per game, in a
 * shuffled order that is stable for the whole day. Puzzles you already solved are skipped.
 */
export function buildDeck(games: AnalyzedGame[], solved: ReadonlySet<string>, day: string, size = 5): MoveError[] {
  const pool: MoveError[] = [];
  for (const { analysis } of games) {
    const best = analysis.errors.filter((e) => e.trainable && !solved.has(puzzleId(e))).sort((a, b) => b.winLoss - a.winLoss);
    pool.push(...best.slice(0, 2));
  }
  pool.sort((a, b) => b.winLoss - a.winLoss || puzzleId(a).localeCompare(puzzleId(b)));
  const top = pool.slice(0, size * 3);
  const rand = mulberry32(hash(day));
  for (let i = top.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [top[i], top[j]] = [top[j], top[i]];
  }
  return top.slice(0, size);
}
