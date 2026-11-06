import { NextResponse } from 'next/server';
import { recentlyTrackedUsernames, saveSnapshot } from '../../../../lib/snapshots';

// Players looked up in the last TRACK_DAYS days get a snapshot every day, so their Puzzle Rush
// history keeps growing even on days nobody opens their page.
const TRACK_DAYS = 90;
const MAX_PLAYERS = 200;
const CONCURRENCY = 4;

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Called once a day by Vercel Cron (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET` when the CRON_SECRET env var is set; anything else is
 * rejected so the endpoint cannot be used to hammer Chess.com.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const usernames = await recentlyTrackedUsernames(TRACK_DAYS, MAX_PLAYERS);
  let saved = 0;
  const failed: string[] = [];

  let next = 0;
  const worker = async () => {
    while (next < usernames.length) {
      const username = usernames[next++];
      try {
        if ((await saveSnapshot(username)).saved) saved += 1;
      } catch {
        failed.push(username);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, usernames.length) }, worker));

  return NextResponse.json({ ok: true, players: usernames.length, saved, failed });
}
