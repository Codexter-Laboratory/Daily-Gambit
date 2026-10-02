import { NextResponse } from 'next/server';
import { fetchPlayerTournaments } from '../../../lib/chesscom';
import { badUsernameResponse, errorResponse, parseUsername } from '../../../lib/apiRoute';

export async function GET(req: Request) {
  const username = parseUsername(req);
  if (!username) return badUsernameResponse();

  try {
    const tournaments = await fetchPlayerTournaments(username);
    return NextResponse.json({ username, tournaments });
  } catch (e) {
    return errorResponse(e, 'Failed to fetch tournaments.');
  }
}
