import { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import * as services from './services';
import {
  INVALID_USERNAME_MESSAGE,
  PLAYER_NOT_FOUND_MESSAGE,
  PLAYER_UNAVAILABLE_MESSAGE,
  USERNAME_RE,
  normalizeUsername,
} from '../../lib/username';

export const playerPath = (username: string) => `/player/${encodeURIComponent(username)}`;

type Options = {
  /** The player whose page this is. Searching for the same name refreshes instead of navigating. */
  currentUsername?: string;
  onRefresh?: (username: string) => void;
  initialError?: string | null;
};

/**
 * The search box's behaviour, shared by the landing page, the not-found page and the dashboard.
 *
 * A name is checked against Chess.com first, and the page only navigates if the player exists. A
 * misspelled name leaves the URL and the current page alone and just shows the error. (Navigating
 * first would flash the next page and then replace it with "not found".)
 */
export function usePlayerSearch({ currentUsername, onRefresh, initialError = null }: Options = {}) {
  const router = useRouter();
  const [username, setUsername] = useState(currentUsername ?? '');
  const [error, setError] = useState<string | null>(initialError);
  const [checking, setChecking] = useState(false);
  // The navigation runs as a transition: the current page stays interactive and isPending
  // keeps the spinner going while the next page renders on the server.
  const [isPending, startTransition] = useTransition();
  const latest = useRef(0);

  const search = useCallback(
    async (name: string) => {
      const clean = normalizeUsername(name);
      if (!clean) return;
      // Say what is wrong with the name instead of reporting "not found".
      if (!USERNAME_RE.test(clean)) {
        setError(INVALID_USERNAME_MESSAGE);
        return;
      }
      setError(null);
      if (clean === currentUsername) {
        onRefresh?.(clean);
        return;
      }

      const id = ++latest.current;
      setChecking(true);
      try {
        // The profile request is cached by Next for a few minutes, so the player page that opens next reuses it.
        if (!(await services.fetchProfile(clean))) throw new services.ApiRequestError(404, 'not found');
        if (id !== latest.current) return;
        startTransition(() => router.push(playerPath(clean)));
      } catch (e) {
        if (id !== latest.current) return;
        const notFound = e instanceof services.ApiRequestError && (e.status === 404 || e.status === 400);
        setError(notFound ? PLAYER_NOT_FOUND_MESSAGE : PLAYER_UNAVAILABLE_MESSAGE);
      } finally {
        if (id === latest.current) setChecking(false);
      }
    },
    [currentUsername, onRefresh, router]
  );

  return { username, setUsername, error, setError, isBusy: checking || isPending, search };
}
