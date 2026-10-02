import { NextResponse } from 'next/server';
import { fetchPlayerProfile } from '../../../lib/chesscom';
import { badUsernameResponse, errorResponse, parseUsername } from '../../../lib/apiRoute';

export async function GET(req: Request) {
  const username = parseUsername(req);
  if (!username) return badUsernameResponse();

  try {
    const profile = await fetchPlayerProfile(username);
    return NextResponse.json({ username, profile });
  } catch (e) {
    return errorResponse(e, 'Failed to fetch profile.');
  }
}
