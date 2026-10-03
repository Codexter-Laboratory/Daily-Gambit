import 'server-only';
import { cache } from 'react';
import {
  ChessComApiError,
  fetchPlayerOnlineStatus,
  fetchPlayerProfile,
  type OnlineStatus,
  type PlayerProfile,
} from '../../lib/chesscom';

const TIMEOUT_MS = 8_000;

export type ProfileResult =
  | { status: 'ok'; profile: PlayerProfile }
  | { status: 'missing' } // Chess.com says there is no such player
  | { status: 'unavailable' }; // Chess.com is down, rate limiting us, or too slow

/**
 * Profile for the player page. A Chess.com outage does not throw: the page still renders, without the
 * profile card (graceful degradation), instead of showing an error page for data that is not essential.
 *
 * Wrapped in React cache(): generateMetadata() and the page both call this in one render,
 * and only one request goes out (request memoization).
 */
export const getProfile = cache(async (username: string): Promise<ProfileResult> => {
  try {
    const profile = await fetchPlayerProfile(username, AbortSignal.timeout(TIMEOUT_MS));
    return { status: 'ok', profile };
  } catch (e) {
    if (e instanceof ChessComApiError && e.status === 404) return { status: 'missing' };
    return { status: 'unavailable' };
  }
});

/** The online dot is a nice-to-have: if this call fails the page still renders without it. */
export const getOnlineStatus = cache(async (username: string): Promise<OnlineStatus | null> => {
  try {
    return await fetchPlayerOnlineStatus(username, AbortSignal.timeout(TIMEOUT_MS));
  } catch {
    return null;
  }
});
