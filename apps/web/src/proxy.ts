import { NextResponse, type NextRequest } from 'next/server';
import { USERNAME_RE, normalizeUsername } from './lib/username';

// Two redirects that must happen before a page is rendered or served from the ISR cache
// (a redirect() inside a cached page is sent as a 200 that redirects in the browser):
//  - old shared links, /?u=hikaru, to the player page /player/hikaru
//  - /player/Hikaru to the one canonical lowercase URL, so each player has one cache entry
export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (pathname === '/') {
    const username = normalizeUsername(searchParams.get('u') ?? '');
    if (!USERNAME_RE.test(username)) return NextResponse.next();
    return NextResponse.redirect(new URL(`/player/${username}`, req.url));
  }

  const raw = decodeURIComponent(pathname.slice('/player/'.length));
  const username = normalizeUsername(raw);
  if (raw !== username && USERNAME_RE.test(username)) {
    return NextResponse.redirect(new URL(`/player/${username}`, req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/', '/player/:username'] };
