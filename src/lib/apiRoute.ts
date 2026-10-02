import { NextResponse } from 'next/server';
import { ChessComApiError } from './chesscom';

const USERNAME_RE = /^[a-zA-Z0-9_]{1,64}$/;

/**
 * Reads ?username= and returns it lowercased, or null if missing or invalid.
 * Chess.com usernames are case-insensitive. Using one canonical form everywhere stops
 * "Hikaru" and "hikaru" from becoming two separate snapshot histories.
 */
export function parseUsername(req: Request): string | null {
  const raw = new URL(req.url).searchParams.get('username')?.trim() ?? '';
  return USERNAME_RE.test(raw) ? raw.toLowerCase() : null;
}

export function badUsernameResponse() {
  return NextResponse.json({ error: 'Missing or invalid username.' }, { status: 400 });
}

/**
 * Turns an error into a response with a sensible status:
 *  - Chess.com says the player does not exist -> 404 (was a 500)
 *  - Chess.com is rate limiting or down       -> 502
 *  - anything else                            -> 500
 * The 404 message contains "not found", which the UI's friendly-error mapping looks for.
 */
export function errorResponse(e: unknown, fallback: string) {
  if (e instanceof ChessComApiError) {
    if (e.status === 404) {
      return NextResponse.json({ error: 'Chess.com player not found.' }, { status: 404 });
    }
    if (e.status === 429 || e.status >= 500) {
      return NextResponse.json(
        { error: 'Chess.com is unavailable right now. Please try again shortly.' },
        { status: 502 }
      );
    }
  }
  return NextResponse.json(
    { error: e instanceof Error && e.message ? e.message : fallback },
    { status: 500 }
  );
}
