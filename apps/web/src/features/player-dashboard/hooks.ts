import { useCallback, useMemo, useRef, useState } from 'react';
import type { GamesTimeClass } from './types';
import * as services from './services';
import { computeRatingChart, computeStatsSummary } from './derived';
import { toFriendlyErrorMessage } from '../../utils/errorMessage';
import { normalizeUsername } from '../../lib/username';

/**
 * Everything on the player page except the profile card, which the server renders (see
 * app/player/[username]/page.tsx). The page is for one player and the server already confirmed
 * that player exists, so the hook starts with every section loading.
 */
export function usePlayerDashboard(username: string) {
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<unknown | null>(null);
  const [clubs, setClubs] = useState<unknown | null>(null);
  const [tournaments, setTournaments] = useState<unknown | null>(null);
  const [matches, setMatches] = useState<unknown | null>(null);
  const [currentGames, setCurrentGames] = useState<unknown | null>(null);
  const [timeClass, setTimeClass] = useState<GamesTimeClass>('blitz');
  const [months, setMonths] = useState(6);
  const [games, setGames] = useState<Awaited<ReturnType<typeof services.fetchGames>> | null>(null);

  // Start in the loading state, so the server-rendered HTML already shows skeletons.
  const [statsLoading, setStatsLoading] = useState(true);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [currentGamesLoading, setCurrentGamesLoading] = useState(true);
  const [gamesLoading, setGamesLoading] = useState(true);

  // Each refreshAll() bumps the generation; results from an older generation are
  // dropped, so a slow response from an earlier refresh never overwrites a newer one.
  const generation = useRef(0);
  const gamesRequest = useRef(0);

  const runLoader = useCallback(
    async <T>(
      setLoading: (v: boolean) => void,
      setValue: (v: T | null) => void,
      fetcher: () => Promise<T | null>
    ): Promise<T | null> => {
      const gen = generation.current;
      setLoading(true);
      try {
        const result = (await fetcher()) ?? null;
        if (gen === generation.current) setValue(result);
        return result;
      } catch {
        if (gen === generation.current) setValue(null);
        return null;
      } finally {
        if (gen === generation.current) setLoading(false);
      }
    },
    []
  );

  const loadGames = useCallback(
    async (nextUsername: string, nextTimeClass: GamesTimeClass, nextMonths: number, fresh = false) => {
      const request = ++gamesRequest.current;
      setGamesLoading(true);
      try {
        const result = await services.fetchGames(nextUsername, nextTimeClass, nextMonths, { fresh });
        if (request === gamesRequest.current) setGames(result ?? null);
      } catch (e) {
        if (request === gamesRequest.current) {
          setError(toFriendlyErrorMessage(e, 'Failed to load games.'));
          setGames(null);
        }
      } finally {
        if (request === gamesRequest.current) setGamesLoading(false);
      }
    },
    []
  );

  const setAllLoading = useCallback((value: boolean) => {
    setStatsLoading(value);
    setClubsLoading(value);
    setTournamentsLoading(value);
    setMatchesLoading(value);
    setCurrentGamesLoading(value);
    setGamesLoading(value);
  }, []);

  /**
   * Loads every section for one player, all at once.
   *  - forceFresh: the Refresh button. Asks the API to skip its cache for these reads.
   * The same player keeps its data on screen while it refreshes.
   */
  const refreshAll = useCallback(
    async (nextUsername: string, options?: { forceFresh?: boolean }) => {
      const clean = normalizeUsername(nextUsername);
      if (!clean) return;
      const fresh = options?.forceFresh ?? false;

      const gen = ++generation.current;
      gamesRequest.current++;

      setError(null);
      setIsRefreshing(true);
      setAllLoading(true);

      await Promise.allSettled([
        runLoader(setStatsLoading, setStats, () => services.fetchStats(clean, { fresh })),
        runLoader(setClubsLoading, setClubs, () => services.fetchClubs(clean, { fresh })),
        runLoader(setTournamentsLoading, setTournaments, () => services.fetchTournaments(clean, { fresh })),
        runLoader(setMatchesLoading, setMatches, () => services.fetchMatches(clean, { fresh })),
        runLoader(setCurrentGamesLoading, setCurrentGames, () => services.fetchCurrentGames(clean, { fresh })),
        loadGames(clean, timeClass, months, fresh),
      ]);

      if (gen === generation.current) setIsRefreshing(false);
    },
    [timeClass, months, runLoader, loadGames, setAllLoading]
  );

  const toMoveGames = useMemo(
    () => (currentGames ? services.filterToMoveGames(currentGames, username) : null),
    [currentGames, username]
  );

  const statsSummary = useMemo(() => computeStatsSummary(stats), [stats]);
  const ratingChart = useMemo(() => computeRatingChart(games), [games]);

  return {
    isRefreshing,
    error,
    statsLoading,
    clubsLoading,
    clubs,
    tournamentsLoading,
    tournaments,
    matchesLoading,
    matches,
    currentGamesLoading,
    currentGames,
    toMoveGamesLoading: currentGamesLoading,
    toMoveGames,
    timeClass,
    setTimeClass,
    months,
    setMonths,
    games,
    gamesLoading,
    statsSummary,
    ratingChart,
    loadGames,
    refreshAll,
  };
}
