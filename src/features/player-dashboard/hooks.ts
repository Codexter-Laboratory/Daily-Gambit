import { useCallback, useMemo, useRef, useState } from 'react';
import type { DashboardResponse, GamesTimeClass } from './types';
import * as services from './services';
import {
  computePuzzleRushSummary,
  computeRatingChart,
  computeStatsSummary,
} from './derived';
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
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [stats, setStats] = useState<unknown | null>(null);
  const [clubs, setClubs] = useState<unknown | null>(null);
  const [tournaments, setTournaments] = useState<unknown | null>(null);
  const [matches, setMatches] = useState<unknown | null>(null);
  const [currentGames, setCurrentGames] = useState<unknown | null>(null);
  const [timeClass, setTimeClass] = useState<GamesTimeClass>('blitz');
  const [months, setMonths] = useState(6);
  const [games, setGames] = useState<Awaited<ReturnType<typeof services.fetchGames>> | null>(null);

  // Start in the loading state, so the server-rendered HTML already shows skeletons.
  const [dashboardLoading, setDashboardLoading] = useState(true);
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

  const loadDashboard = useCallback(
    (nextUsername: string) => runLoader(setDashboardLoading, setData, () => services.fetchDashboard(nextUsername)),
    [runLoader]
  );

  const loadGames = useCallback(
    async (nextUsername: string, nextTimeClass: GamesTimeClass, nextMonths: number) => {
      const request = ++gamesRequest.current;
      setGamesLoading(true);
      try {
        const result = await services.fetchGames(nextUsername, nextTimeClass, nextMonths);
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
    setDashboardLoading(value);
    setStatsLoading(value);
    setClubsLoading(value);
    setTournamentsLoading(value);
    setMatchesLoading(value);
    setCurrentGamesLoading(value);
    setGamesLoading(value);
  }, []);

  /**
   * Loads every section for one player.
   *  - withIngest: save today's Puzzle Rush snapshot first. Only the snapshot-based dashboard
   *    has to wait for it, the other sections load alongside.
   *  - forceFresh: the Refresh button. Also drops the cached Chess.com data for this player, and
   *    every read waits for that, or it would get the old data.
   * The same player keeps its data on screen while it refreshes.
   */
  const refreshAll = useCallback(
    async (nextUsername: string, options?: { withIngest?: boolean; forceFresh?: boolean }) => {
      const clean = normalizeUsername(nextUsername);
      if (!clean) return;

      const gen = ++generation.current;
      gamesRequest.current++;

      setError(null);
      setIsRefreshing(true);
      setAllLoading(true);

      const ingest = options?.withIngest
        ? services.ingestSnapshot(clean, { forceFresh: options.forceFresh }).catch(() => {
            // Continue loading read endpoints even if ingest fails.
          })
        : Promise.resolve();
      const ready = options?.forceFresh ? ingest : Promise.resolve();

      await Promise.allSettled([
        ingest.then(() => loadDashboard(clean)),
        ready.then(() => runLoader(setStatsLoading, setStats, () => services.fetchStats(clean))),
        ready.then(() => runLoader(setClubsLoading, setClubs, () => services.fetchClubs(clean))),
        ready.then(() => runLoader(setTournamentsLoading, setTournaments, () => services.fetchTournaments(clean))),
        ready.then(() => runLoader(setMatchesLoading, setMatches, () => services.fetchMatches(clean))),
        ready.then(() => runLoader(setCurrentGamesLoading, setCurrentGames, () => services.fetchCurrentGames(clean))),
        ready.then(() => loadGames(clean, timeClass, months)),
      ]);

      if (gen === generation.current) setIsRefreshing(false);
    },
    [timeClass, months, runLoader, loadDashboard, loadGames, setAllLoading]
  );

  const toMoveGames = useMemo(
    () => (currentGames ? services.filterToMoveGames(currentGames, username) : null),
    [currentGames, username]
  );

  const statsSummary = useMemo(() => computeStatsSummary(stats), [stats]);
  const puzzleRushSummary = useMemo(() => computePuzzleRushSummary(statsSummary), [statsSummary]);
  const ratingChart = useMemo(() => computeRatingChart(games), [games]);

  return {
    isRefreshing,
    error,
    data,
    dashboardLoading,
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
    puzzleRushSummary,
    ratingChart,
    loadGames,
    refreshAll,
  };
}
