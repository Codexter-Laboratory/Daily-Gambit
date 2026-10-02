import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { badUsernameResponse, parseUsername } from '../../../lib/apiRoute';
import {
  computePuzzleRushActivityStreak,
  type PuzzleRushPoint,
} from '../../../lib/streaks';

function isoDateUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const username = parseUsername(req);
  if (!username) return badUsernameResponse();

  try {
    const snapshots = await prisma.puzzleRushSnapshot.findMany({
      where: { username },
      orderBy: { asOf: 'asc' },
      select: {
        asOf: true,
        attemptsTotal: true,
        scoreTotal: true,
      },
    });

    const points: PuzzleRushPoint[] = snapshots.map((s) => ({
      date: isoDateUTC(s.asOf),
      attemptsTotal: s.attemptsTotal,
      scoreTotal: s.scoreTotal,
      attemptsDelta: null,
      scoreDelta: null,
    }));

    // Compute day-over-day deltas from totals snapshots.
    for (let i = 0; i < points.length; i++) {
      const prev = points[i - 1];
      const cur = points[i];
      if (!prev) continue;
      if (typeof prev.attemptsTotal === 'number' && typeof cur.attemptsTotal === 'number') {
        cur.attemptsDelta = cur.attemptsTotal - prev.attemptsTotal;
      }
      if (typeof prev.scoreTotal === 'number' && typeof cur.scoreTotal === 'number') {
        cur.scoreDelta = cur.scoreTotal - prev.scoreTotal;
      }
    }

    return NextResponse.json({
      username,
      puzzleRush: {
        points,
        streak: computePuzzleRushActivityStreak(points),
      },
    });
  } catch (e) {
    // Without this a database error became an HTML 500 page, and the client crashed trying to
    // parse it as JSON.
    console.error('Dashboard query failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Could not load Puzzle Rush history.' }, { status: 500 });
  }
}
