import { NextResponse } from 'next/server';
import { fetchRecentAnalysisGames } from '../../../lib/chesscom';
import { badUsernameResponse, errorResponse, parseUsername } from '../../../lib/apiRoute';

const MAX_GAMES = 100;
const TIME_CLASSES = ['bullet', 'blitz', 'rapid', 'daily'];
const DEFAULT_GAMES = 20;

/** Recent games with PGNs. The browser runs the engine on them, so the server never does the heavy work. */
export async function GET(req: Request) {
  const username = parseUsername(req);
  if (!username) return badUsernameResponse();

  const raw = new URL(req.url).searchParams.get('limit');
  const limit = raw === null ? DEFAULT_GAMES : Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_GAMES) {
    return NextResponse.json({ error: `Invalid limit (1-${MAX_GAMES}).` }, { status: 400 });
  }

  const timeClass = new URL(req.url).searchParams.get('timeClass') || undefined;
  if (timeClass && !TIME_CLASSES.includes(timeClass)) {
    return NextResponse.json({ error: 'Invalid timeClass.' }, { status: 400 });
  }

  try {
    const data = await fetchRecentAnalysisGames({ username, limit, timeClass });
    return NextResponse.json({ username, ...data });
  } catch (e) {
    return errorResponse(e, 'Failed to fetch games.');
  }
}
