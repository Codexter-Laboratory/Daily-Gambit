import { NextResponse } from 'next/server';
import { fetchCurrentGames } from '../../../lib/chesscom';
import { badUsernameResponse, errorResponse, parseUsername } from '../../../lib/apiRoute';

export async function GET(req: Request) {
  const username = parseUsername(req);
  if (!username) return badUsernameResponse();

  try {
    const currentGames = await fetchCurrentGames(username);
    return NextResponse.json({ username, currentGames });
  } catch (e) {
    return errorResponse(e, 'Failed to fetch current games.');
  }
}
