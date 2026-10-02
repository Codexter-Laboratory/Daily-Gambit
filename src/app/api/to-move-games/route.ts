import { NextResponse } from 'next/server';
import { fetchToMoveGames } from '../../../lib/chesscom';
import { badUsernameResponse, errorResponse, parseUsername } from '../../../lib/apiRoute';

export async function GET(req: Request) {
  const username = parseUsername(req);
  if (!username) return badUsernameResponse();

  try {
    const toMoveGames = await fetchToMoveGames(username);
    return NextResponse.json({ username, toMoveGames });
  } catch (e) {
    return errorResponse(e, 'Failed to fetch to-move games.');
  }
}
