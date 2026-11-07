import 'server-only';
import { cache } from 'react';
import type { PlayerProfile, ProfileResponse } from '@daily-gambit/contracts';
import { ApiRequestError, apiRequest } from '../../lib/api';

const TIMEOUT_MS = 8_000;
/** The page is cached for a minute (ISR), so asking the API more often than that gains nothing. */
const REVALIDATE_SECONDS = 60;

export type ProfileResult =
  | { status: 'ok'; profile: PlayerProfile }
  | { status: 'missing' } // Chess.com says there is no such player
  | { status: 'unavailable' }; // the API or Chess.com is down, rate limiting us, or too slow

/**
 * Profile for the player page. An outage does not throw: the page still renders, without the
 * profile card (graceful degradation), instead of showing an error page for data that is not essential.
 *
 * Wrapped in React cache(): generateMetadata() and the page both call this in one render,
 * and only one request goes out (request memoization).
 */
export const getProfile = cache(async (username: string): Promise<ProfileResult> => {
  try {
    const body = await apiRequest<ProfileResponse>(`/v1/players/${encodeURIComponent(username)}/profile`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    return { status: 'ok', profile: body.profile };
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 404) return { status: 'missing' };
    return { status: 'unavailable' };
  }
});
