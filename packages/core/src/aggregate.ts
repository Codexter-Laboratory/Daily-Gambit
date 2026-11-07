import { conversion } from './conversion';
import { MOTIF_LABELS, motifBreakdown } from './patterns';
import { timeStats } from './timeStats';
import type { AnalyzedGame, Motif, MoveError, Phase, Side } from './types';

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
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
    perGame: { inaccuracy: round2(totals.inaccuracy / n), mistake: round2(totals.mistake / n), blunder: round2(totals.blunder / n) },
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

const MOTIF_ADVICE: Partial<Record<Motif, string>> = {
  'hung-piece': 'Before every move, check what your opponent can capture afterwards.',
  'missed-capture': 'Before settling for a quiet move, check every capture on the board.',
  'missed-mate': 'Look at every check before every move, especially when you are ahead.',
  'allowed-mate': 'Check your opponent’s checks before moving: keep your king safe.',
  'missed-tactic': 'Look for checks, captures and threats first, on every move.',
};

/** Insights shown at the top of the page: plain sentences about the biggest fixes, most useful first. */
export function topInsights(games: AnalyzedGame[]): string[] {
  if (games.length < 3) return [];
  const out: string[] = [];
  const s = summarize(games);

  const motifs = motifBreakdown(games);
  const top = motifs[0];
  if (top && top.key !== 'positional' && top.count >= 3 && top.pct >= 30) {
    out.push(`${top.pct}% of your serious errors are "${MOTIF_LABELS[top.key].toLowerCase()}". ${MOTIF_ADVICE[top.key] ?? ''}`.trim());
  }

  const phases = phaseBreakdown(games).filter((p) => p.moves >= 20);
  const worstPhase = [...phases].sort((a, b) => b.errorsPer100 - a.errorsPer100)[0];
  if (worstPhase && worstPhase.errorsPer100 > 0) {
    out.push(`Most of your serious errors come in the ${worstPhase.phase}: ${worstPhase.errorsPer100} per 100 moves.`);
  }

  const leak = openingReport(games).find((o) => o.cost > 0);
  if (leak) {
    out.push(`${leak.opening} as ${leak.color === 'white' ? 'White' : 'Black'} is your costliest opening: ${leak.scorePct}% over ${leak.games} games.`);
  }

  const conv = conversion(games);
  if (conv.winning.thrown >= 2) {
    out.push(`You had a clearly winning position in ${conv.winning.games} games and failed to win ${conv.winning.thrown} of them.`);
  }

  const time = timeStats(games);
  const { normal, trouble } = time.seriousPer100;
  if (normal !== null && trouble !== null && trouble > normal * 1.5 && trouble - normal >= 3) {
    out.push(`In time trouble you make ${trouble} serious errors per 100 moves, against ${normal} with time on the clock.`);
  }

  if (s.perGame.blunder >= 0.5) {
    out.push(`You blunder about once every ${round1(1 / s.perGame.blunder)} games. Fixing those is the fastest rating gain.`);
  }
  return out.slice(0, 4);
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
 * shuffled order that is stable for the whole day. Puzzles you already solved are skipped, and
 * puzzles you got wrong before (`retry`) come first until you solve them.
 */
export function buildDeck(games: AnalyzedGame[], solved: ReadonlySet<string>, day: string, size = 5, retry: ReadonlySet<string> = new Set()): MoveError[] {
  const pool: MoveError[] = [];
  for (const { analysis } of games) {
    const best = analysis.errors.filter((e) => e.trainable && !solved.has(puzzleId(e))).sort((a, b) => b.winLoss - a.winLoss);
    // A puzzle you failed before is always kept, even if it is not one of the game's two biggest.
    pool.push(...best.filter((e, i) => i < 2 || retry.has(puzzleId(e))));
  }
  pool.sort((a, b) => b.winLoss - a.winLoss || puzzleId(a).localeCompare(puzzleId(b)));
  // Failed puzzles are never cut by the size limit below.
  const top = [...pool.filter((e) => retry.has(puzzleId(e))), ...pool.filter((e) => !retry.has(puzzleId(e))).slice(0, size * 3)];
  const rand = mulberry32(hash(day));
  for (let i = top.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [top[i], top[j]] = [top[j], top[i]];
  }
  const retries = top.filter((e) => retry.has(puzzleId(e)));
  const fresh = top.filter((e) => !retry.has(puzzleId(e)));
  return [...retries, ...fresh].slice(0, size);
}
