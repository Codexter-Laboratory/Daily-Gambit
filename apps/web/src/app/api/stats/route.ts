import { NextResponse } from 'next/server';
import { fetchPlayerStats } from '../../../lib/chesscom';
import { badUsernameResponse, errorResponse, parseUsername } from '../../../lib/apiRoute';

export async function GET(req: Request) {
  const username = parseUsername(req);
  if (!username) return badUsernameResponse();

  try {
    const stats = await fetchPlayerStats(username);
    return NextResponse.json({ username, stats });
  } catch (e) {
    return errorResponse(e, 'Failed to fetch stats.');
  }
}
