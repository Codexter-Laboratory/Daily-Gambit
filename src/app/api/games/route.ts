import { NextResponse } from 'next/server';
import { fetchRatingSeriesFromArchives, type GameTimeClass } from '../../../lib/chesscom';
import { errorResponse, parseUsername } from '../../../lib/apiRoute';

const allowed: GameTimeClass[] = [
  'bullet',
  'blitz',
  'rapid',
  'daily',
  'chess960',
  'bughouse',
  'crazyhouse',
  'kingofthehill',
  'threecheck',
  'atomic',
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = parseUsername(req);
  const timeClass = (searchParams.get('timeClass')?.trim() ?? 'blitz') as GameTimeClass;
  const monthsRaw = searchParams.get('months')?.trim();
  const months = monthsRaw ? Number(monthsRaw) : 6;

  if (!username) {
    return NextResponse.json({ error: 'Missing or invalid username.' }, { status: 400 });
  }
  if (!allowed.includes(timeClass)) {
    return NextResponse.json({ error: 'Invalid timeClass.' }, { status: 400 });
  }
  if (!Number.isFinite(months) || months < 1 || months > 36) {
    return NextResponse.json({ error: 'Invalid months (1-36).' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const data = await fetchRatingSeriesFromArchives({
      username,
      timeClass,
      months,
      signal: controller.signal,
    });
    return NextResponse.json({ username, timeClass, months, ...data });
  } catch (e) {
    return errorResponse(e, 'Failed to fetch games.');
  }
}

