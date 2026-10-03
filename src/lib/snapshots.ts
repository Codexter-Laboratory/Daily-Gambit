import { prisma } from './prisma';
import { fetchPuzzleRushDailyStats } from './chesscom';

export type SnapshotResult = {
  username: string;
  asOf: string;
  saved: boolean;
  attemptsTotal: number | null;
  scoreTotal: number | null;
  bestScore: number | null;
};

function todayUTC(): { iso: string; date: Date } {
  const iso = new Date().toISOString().slice(0, 10);
  return { iso, date: new Date(iso + 'T00:00:00.000Z') };
}

/**
 * Saves today's Puzzle Rush numbers for one player. Chess.com publishes no Puzzle Rush history,
 * so these daily rows are the only way to chart it over time.
 * Throws ChessComApiError when Chess.com fails, so callers can map it to a status.
 */
export async function saveSnapshot(username: string): Promise<SnapshotResult> {
  const { iso, date: asOf } = todayUTC();
  const stats = await fetchPuzzleRushDailyStats(username);

  // No Puzzle Rush numbers at all: save nothing. A row full of nulls is worse than no row: it
  // would overwrite a good snapshot from earlier today and break the day-over-day change.
  if (stats.attemptsTotal === null && stats.scoreTotal === null && stats.bestScore === null) {
    return { username, asOf: iso, saved: false, ...stats };
  }

  const snapshot = await prisma.puzzleRushSnapshot.upsert({
    where: { username_asOf: { username, asOf } },
    create: { username, asOf, ...stats },
    update: {
      // Only overwrite with real numbers; never replace a value with null.
      ...(stats.attemptsTotal !== null ? { attemptsTotal: stats.attemptsTotal } : {}),
      ...(stats.scoreTotal !== null ? { scoreTotal: stats.scoreTotal } : {}),
      ...(stats.bestScore !== null ? { bestScore: stats.bestScore } : {}),
    },
  });

  return {
    username,
    asOf: iso,
    saved: true,
    attemptsTotal: snapshot.attemptsTotal,
    scoreTotal: snapshot.scoreTotal,
    bestScore: snapshot.bestScore,
  };
}

/** Players looked up recently enough to keep tracking automatically. */
export async function recentlyTrackedUsernames(days: number, limit: number): Promise<string[]> {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await prisma.puzzleRushSnapshot.groupBy({
    by: ['username'],
    where: { fetchedAt: { gte: since } },
    _max: { fetchedAt: true },
    orderBy: { _max: { fetchedAt: 'desc' } },
    take: limit,
  });
  return rows.map((r) => r.username);
}
