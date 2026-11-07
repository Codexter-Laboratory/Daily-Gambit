import { NextResponse } from 'next/server';
import { fetchPlayerClubs } from '../../../lib/chesscom';
import { badUsernameResponse, errorResponse, parseUsername } from '../../../lib/apiRoute';

export async function GET(req: Request) {
  const username = parseUsername(req);
  if (!username) return badUsernameResponse();

  try {
    const clubs = await fetchPlayerClubs(username);
    return NextResponse.json({ username, clubs });
  } catch (e) {
    return errorResponse(e, 'Failed to fetch clubs.');
  }
}
