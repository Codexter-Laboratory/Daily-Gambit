import { NextResponse } from 'next/server';
import { fetchPlayerMatches } from '../../../lib/chesscom';
import { badUsernameResponse, errorResponse, parseUsername } from '../../../lib/apiRoute';

export async function GET(req: Request) {
  const username = parseUsername(req);
  if (!username) return badUsernameResponse();

  try {
    const matches = await fetchPlayerMatches(username);
    return NextResponse.json({ username, matches });
  } catch (e) {
    return errorResponse(e, 'Failed to fetch matches.');
  }
}
