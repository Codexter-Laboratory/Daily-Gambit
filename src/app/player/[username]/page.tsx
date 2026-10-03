import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PlayerDashboard } from '../../../features/player-dashboard';
import { PlayerProfileSection, PlayerProfileUnavailable } from '../../../features/player-dashboard/PlayerProfileSection';
import { getOnlineStatus, getProfile } from '../../../features/player-dashboard/server';
import { USERNAME_RE, normalizeUsername } from '../../../lib/username';

// ISR: the first request for a player renders the page on the server and caches the HTML.
// Later requests get the cached page, and after 60 seconds the next one triggers a
// regeneration in the background. Personal data is not on this page (there are no accounts),
// and the live parts (charts, games, clubs) load on the client, so a shared cache is safe.
export const revalidate = 60;

// No player is known at build time. Exporting this (even empty) lets Next cache pages
// that are generated on demand, instead of rendering every request from scratch.
export function generateStaticParams() {
  return [];
}

/** The canonical username from the URL, or null if it is not a valid one. */
function parseParam(raw: string): string | null {
  const username = normalizeUsername(raw);
  return USERNAME_RE.test(username) ? username : null;
}

type PageProps = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const username = parseParam((await params).username);
  if (!username) return { title: 'Player not found' };
  const result = await getProfile(username);
  if (result.status === 'missing') return { title: 'Player not found' };
  if (result.status === 'unavailable') return { title: `@${username}` };
  const profile = result.profile;
  return {
    title: `${profile.name || profile.username} (@${profile.username})`,
    description: `Ratings, Puzzle Rush streak, live games, clubs and tournaments for ${profile.username} on Chess.com.`,
  };
}

export default async function PlayerPage({ params }: PageProps) {
  const raw = (await params).username;
  const username = parseParam(raw);
  if (!username) notFound();
  // proxy.ts already redirects non-canonical URLs, this is the fallback.
  if (raw !== username) redirect(`/player/${username}`);

  // Two independent requests started together: no waterfall. getProfile is the same
  // memoized call that generateMetadata already made, so it does not hit Chess.com twice.
  const [result, onlineStatus] = await Promise.all([getProfile(username), getOnlineStatus(username)]);
  // Renders not-found.tsx. Note: with ISR, Next 16 caches this page and serves it with status 200 plus
  // a noindex tag, not a 404 status, so crawlers skip it but the status code is not a reliable signal.
  if (result.status === 'missing') notFound();

  return (
    // key: a different player gets a fresh dashboard, with none of the previous player's state.
    <PlayerDashboard
      key={username}
      username={username}
      profile={
        result.status === 'ok' ? (
          <PlayerProfileSection profile={result.profile} onlineStatus={onlineStatus} />
        ) : (
          <PlayerProfileUnavailable username={username} />
        )
      }
    />
  );
}
