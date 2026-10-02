import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { fetchPuzzleRushDailyStats } from '../../../lib/chesscom';
import { badUsernameResponse, errorResponse, parseUsername } from '../../../lib/apiRoute';

function isoDateUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseISODateUTC(iso: string) {
  return new Date(iso + 'T00:00:00.000Z');
}

export async function GET(req: Request) {
  const username = parseUsername(req);
  if (!username) return badUsernameResponse();

  const asOfISO = isoDateUTC(new Date());
  const asOf = parseISODateUTC(asOfISO);

  try {
    const stats = await fetchPuzzleRushDailyStats(username);

    // No Puzzle Rush numbers (the player has none, or the response had no such block): save
    // nothing. A row full of nulls is worse than no row: it would overwrite a good snapshot
    // from earlier today, and the next day's change (today minus a null) could not be
    // computed, which silently broke the streak.
    if (stats.attemptsTotal === null && stats.scoreTotal === null) {
      return NextResponse.json({
        ok: true,
        saved: false,
        username,
        asOf: asOfISO,
        attemptsTotal: null,
        scoreTotal: null,
      });
    }

    const snapshot = await prisma.puzzleRushSnapshot.upsert({
      where: { username_asOf: { username, asOf } },
      create: {
        username,
        asOf,
        attemptsTotal: stats.attemptsTotal,
        scoreTotal: stats.scoreTotal,
      },
      update: {
        // Only overwrite with real numbers; never replace a value with null.
        ...(stats.attemptsTotal !== null ? { attemptsTotal: stats.attemptsTotal } : {}),
        ...(stats.scoreTotal !== null ? { scoreTotal: stats.scoreTotal } : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      saved: true,
      username,
      asOf: asOfISO,
      attemptsTotal: snapshot.attemptsTotal,
      scoreTotal: snapshot.scoreTotal,
    });
  } catch (e) {
    return errorResponse(e, 'Failed to ingest.');
  }
}
