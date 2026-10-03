import { extractPuzzleRush } from '../../lib/puzzleRush';

export type StatsSummary = {
  chess: { label: string; rating: number | null; date: string | null; games: number | null; win: number | null; loss: number | null; draw: number | null }[];
  puzzles: {
    rushDailyAttempts: number | null;
    rushDailyScore: number | null;
    rushBestScore: number | null;
  };
};

export function computeStatsSummary(stats: unknown): StatsSummary | null {
  if (!stats) return null;
  const s = stats as Record<string, unknown>;

  const rush = extractPuzzleRush(stats);

  const chess = [
    ['Bullet', s?.chess_bullet],
    ['Blitz', s?.chess_blitz],
    ['Rapid', s?.chess_rapid],
    ['Daily', s?.chess_daily],
  ] as const;

  const summarizeTimeControl = (obj: unknown) => {
    const o = obj as { last?: { rating?: number; date?: number }; record?: { win?: number; loss?: number; draw?: number } } | undefined;
    const last = o?.last;
    return {
      rating: typeof last?.rating === 'number' ? last.rating : null,
      date: typeof last?.date === 'number' ? new Date(last.date * 1000).toISOString().slice(0, 10) : null,
      games: typeof o?.record?.win === 'number' ? (o.record.win + (o.record.loss ?? 0) + (o.record.draw ?? 0)) : null,
      win: typeof o?.record?.win === 'number' ? o.record.win : null,
      loss: typeof o?.record?.loss === 'number' ? o.record.loss : null,
      draw: typeof o?.record?.draw === 'number' ? o.record.draw : null,
    };
  };

  return {
    chess: chess
      .map(([label, obj]) => ({ label, ...summarizeTimeControl(obj) }))
      .filter((x) => x.rating !== null || x.games !== null),
    puzzles: {
      rushDailyAttempts: rush.dailyAttempts,
      rushDailyScore: rush.dailyScore,
      rushBestScore: rush.bestScore,
    },
  };
}

export type PuzzleRushSummary = {
  dailyAttempts: number | null;
  dailyScore: number | null;
  bestScore: number | null;
  /** Average score per attempt (score divided by attempts). Not a percentage. */
  avgScorePerAttempt: number | null;
  lastUpdated: string;
};

export function computePuzzleRushSummary(statsSummary: StatsSummary | null): PuzzleRushSummary | null {
  if (!statsSummary) return null;

  const dailyAttempts = statsSummary.puzzles.rushDailyAttempts;
  const dailyScore = statsSummary.puzzles.rushDailyScore;
  const bestScore = statsSummary.puzzles.rushBestScore;
  // This is score / attempts, which is an average score, not an accuracy percentage.
  const avgScorePerAttempt =
    dailyAttempts && dailyScore != null ? Math.round((dailyScore / dailyAttempts) * 10) / 10 : null;

  return {
    dailyAttempts,
    dailyScore,
    bestScore,
    avgScorePerAttempt,
    lastUpdated: new Date().toLocaleString(),
  };
}

export type RatingChartPoint = { date: string; rating: number | null };

export function computeRatingChart(games: { points: { date: string; rating: number }[] } | null): RatingChartPoint[] {
  const points = (games?.points ?? []).map((p) => ({
    date: p.date,
    rating: typeof p.rating === 'number' && Number.isFinite(p.rating) ? p.rating : null,
  }));
  return points.length > 0 ? points : [{ date: '', rating: null }];
}
