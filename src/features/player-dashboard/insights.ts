import type { GameEnding, GameRecord } from '../../lib/gameRecords';

export type WDL = { win: number; draw: number; loss: number; games: number };

const emptyWDL = (): WDL => ({ win: 0, draw: 0, loss: 0, games: 0 });

function addResult(t: WDL, result: GameRecord['result']) {
  if (result === 'win') t.win += 1;
  else if (result === 'draw') t.draw += 1;
  else if (result === 'loss') t.loss += 1;
  else return;
  t.games += 1;
}

/** Points scored as a percentage: a win is 1, a draw is ½. */
export function scorePct(t: WDL): number | null {
  return t.games > 0 ? Math.round(((t.win + t.draw / 2) / t.games) * 100) : null;
}

// ---------- Activity heatmap ----------

export type ActivityDay = WDL & { date: string };

export type ActivityGrid = {
  /** Columns of 7 days, Monday first. null pads the first and last week. */
  weeks: (ActivityDay | null)[][];
  /** Upper bounds of levels 1..4; level 5 is anything above the last one. */
  thresholds: number[];
  activeDays: number;
  totalGames: number;
  busiest: ActivityDay | null;
  longestStreak: number;
};

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function buildActivityGrid(points: GameRecord[], months: number, today = new Date()): ActivityGrid {
  const byDate = new Map<string, ActivityDay>();
  for (const p of points) {
    const day = byDate.get(p.date) ?? { date: p.date, ...emptyWDL() };
    addResult(day, p.result);
    byDate.set(p.date, day);
  }

  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - months, end.getUTCDate() + 1));

  const weeks: (ActivityDay | null)[][] = [];
  let week: (ActivityDay | null)[] = Array((start.getUTCDay() + 6) % 7).fill(null);
  let busiest: ActivityDay | null = null;
  let activeDays = 0;
  let totalGames = 0;
  let streak = 0;
  let longestStreak = 0;

  for (let d = start; d <= end; d = new Date(d.getTime() + 86400000)) {
    const iso = isoDay(d);
    const day = byDate.get(iso) ?? { date: iso, ...emptyWDL() };
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    if (day.games > 0) {
      activeDays += 1;
      totalGames += day.games;
      streak += 1;
      longestStreak = Math.max(longestStreak, streak);
      if (!busiest || day.games > busiest.games) busiest = day;
    } else {
      streak = 0;
    }
  }
  if (week.length > 0) weeks.push([...week, ...Array(7 - week.length).fill(null)]);

  // Quantiles of the active days, so one 200-game marathon doesn't wash every other day out.
  const counts = [...byDate.values()].map((d) => d.games).filter((n) => n > 0).sort((a, b) => a - b);
  const q = (f: number) => counts[Math.min(counts.length - 1, Math.floor(f * counts.length))] ?? 0;
  const thresholds = counts.length ? [q(0.2), q(0.4), q(0.6), q(0.8)] : [];

  return { weeks, thresholds, activeDays, totalGames, busiest, longestStreak };
}

export function activityLevel(games: number, thresholds: number[]): number {
  if (games <= 0) return 0;
  const i = thresholds.findIndex((t) => games <= t);
  return i === -1 ? 5 : i + 1;
}

// ---------- Results by colour ----------

export function resultsByColor(points: GameRecord[]): { white: WDL; black: WDL } {
  const out = { white: emptyWDL(), black: emptyWDL() };
  for (const p of points) addResult(out[p.color], p.result);
  return out;
}

// ---------- Score against opponent strength ----------

export type StrengthBucket = WDL & {
  label: string;
  /** What the rating gap predicts (Elo expected score), as a percentage. */
  expectedPct: number | null;
};

const STRENGTH_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '200+ lower', min: -Infinity, max: -200 },
  { label: '100–199 lower', min: -199, max: -100 },
  { label: '0–99 lower', min: -99, max: 0 },
  { label: '1–99 higher', min: 1, max: 99 },
  { label: '100–199 higher', min: 100, max: 199 },
  { label: '200+ higher', min: 200, max: Infinity },
];

export function scoreByOpponentStrength(points: GameRecord[]): StrengthBucket[] {
  const buckets = STRENGTH_BUCKETS.map((b) => ({ ...b, ...emptyWDL(), expectedSum: 0 }));
  for (const p of points) {
    if (p.opponentRating === null || p.result === 'other') continue;
    const gap = p.opponentRating - p.rating;
    const b = buckets.find((x) => gap >= x.min && gap <= x.max);
    if (!b) continue;
    addResult(b, p.result);
    b.expectedSum += 1 / (1 + 10 ** (gap / 400));
  }
  return buckets.map(({ label, win, draw, loss, games, expectedSum }) => ({
    label,
    win,
    draw,
    loss,
    games,
    expectedPct: games > 0 ? Math.round((expectedSum / games) * 100) : null,
  }));
}

// ---------- How games end ----------

export const ENDING_LABELS: Record<GameEnding, string> = {
  checkmate: 'Checkmate',
  resignation: 'Resignation',
  timeout: 'On time',
  abandonment: 'Abandoned',
  agreement: 'Agreed',
  repetition: 'Repetition',
  stalemate: 'Stalemate',
  insufficient: 'Insufficient material',
  '50move': '50-move rule',
  timevsinsufficient: 'Timeout vs insufficient material',
  other: 'Other',
};

export type EndingRow = { ending: GameEnding; count: number };
export type EndingGroups = Record<'win' | 'loss' | 'draw', { total: number; rows: EndingRow[] }>;

export function gameEndings(points: GameRecord[]): EndingGroups {
  const counts = { win: new Map<GameEnding, number>(), loss: new Map<GameEnding, number>(), draw: new Map<GameEnding, number>() };
  for (const p of points) {
    if (p.result === 'other') continue;
    const m = counts[p.result];
    m.set(p.ending, (m.get(p.ending) ?? 0) + 1);
  }
  const group = (m: Map<GameEnding, number>) => {
    const rows = [...m.entries()].map(([ending, count]) => ({ ending, count })).sort((a, b) => b.count - a.count);
    return { total: rows.reduce((s, r) => s + r.count, 0), rows };
  };
  return { win: group(counts.win), loss: group(counts.loss), draw: group(counts.draw) };
}

// ---------- Openings ----------

export type OpeningRow = WDL & { name: string };

export function topOpenings(points: GameRecord[], color: 'white' | 'black', limit = 6): OpeningRow[] {
  const byName = new Map<string, OpeningRow>();
  for (const p of points) {
    if (p.color !== color || !p.opening) continue;
    const row = byName.get(p.opening) ?? { name: p.opening, ...emptyWDL() };
    addResult(row, p.result);
    byName.set(p.opening, row);
  }
  return [...byName.values()]
    .filter((r) => r.games > 0)
    .sort((a, b) => b.games - a.games || a.name.localeCompare(b.name))
    .slice(0, limit);
}
