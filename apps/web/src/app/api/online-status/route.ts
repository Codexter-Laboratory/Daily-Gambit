import { NextResponse } from 'next/server';
import { fetchPlayerOnlineStatus } from '../../../lib/chesscom';
import { badUsernameResponse, parseUsername } from '../../../lib/apiRoute';

export async function GET(req: Request) {
  const username = parseUsername(req);
  if (!username) return badUsernameResponse();

  try {
    const onlineStatus = await fetchPlayerOnlineStatus(username);
    return NextResponse.json({ username, onlineStatus });
  } catch (e) {
    // Presence is a nice-to-have, so do not fail the page. But say "unknown" (null), not
    // "offline": reporting offline during a Chess.com outage showed a wrong grey dot.
    console.error('Online status fetch failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ username, onlineStatus: null });
  }
}
