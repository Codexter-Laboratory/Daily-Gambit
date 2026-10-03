import { useCallback, useMemo, useRef, useState } from 'react';
import type { DashboardResponse, GamesTimeClass } from './types';
import * as services from './services';
import {
  computePuzzleRushSummary,
  computeRatingChart,
  computeStatsSummary,
} from './derived';
import { toFriendlyErrorMessage } from '../../utils/errorMessage';
import { INVALID_USERNAME_MESSAGE, USERNAME_RE, normalizeUsername } from '../../lib/username';

export function usePlayerDashboard() {
  const [username, setUsername] = useState('');
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [stats, setStats] = useState<unknown | null>(null);
  const [profile, setProfile] = useState<unknown | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<unknown | null>(null);
  const [clubs, setClubs] = useState<unknown | null>(null);
  const [tournaments, setTournaments] = useState<unknown | null>(null);
  const [matches, setMatches] = useState<unknown | null>(null);
  const [currentGames, setCurrentGames] = useState<unknown | null>(null);
  const [timeClass, setTimeClass] = useState<GamesTimeClass>('blitz');
  const [months, setMonths] = useState(6);
  const [games, setGames] = useState<Awaited<ReturnType<typeof services.fetchGames>> | null>(null);

  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [onlineStatusLoading, setOnlineStatusLoading] = useState(false);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [currentGamesLoading, setCurrentGamesLoading] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);

  // Each refreshAll() bumps the generation; results from an older generation are
  // dropped, so a slow response for a previous player never overwrites the current one.
  const generation = useRef(0);
  const gamesRequest = useRef(0);
  const activeUsernameRef = useRef<string | null>(null);

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
    setProfileLoading(value);
    setOnlineStatusLoading(value);
    setClubsLoading(value);
    setTournamentsLoading(value);
    setMatchesLoading(value);
    setCurrentGamesLoading(value);
    setGamesLoading(value);
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setStats(null);
    setProfile(null);
    setOnlineStatus(null);
    setClubs(null);
    setTournaments(null);
    setMatches(null);
    setCurrentGames(null);
    setGames(null);
  }, []);

  const refreshAll = useCallback(
    async (nextUsername: string, options?: { withIngest?: boolean; onVerified?: () => void }) => {
      const clean = normalizeUsername(nextUsername);
      if (!clean) return;
      // Say what is wrong with the name instead of sending it to the API and reporting "not found".
      if (!USERNAME_RE.test(clean)) {
        setError(INVALID_USERNAME_MESSAGE);
        return;
      }

      const gen = ++generation.current;
      gamesRequest.current++;
      const previousPlayer = activeUsernameRef.current;
      const isNewPlayer = clean !== previousPlayer;
      activeUsernameRef.current = clean;

      setError(null);
      setIsRefreshing(true);
      // The same player keeps its data on screen while it refreshes. A different player is only
      // shown after the profile check below passes: switching to the dashboard first made a
      // misspelled name flash a page of skeletons before the "not found" message replaced it.
      if (!isNewPlayer) setAllLoading(true);

      // Saving today's snapshot runs alongside the profile check; only the
      // snapshot-based dashboard has to wait for it.
      const ingest = options?.withIngest
        ? services.fetchIngest(clean).catch(() => {
            // Continue loading read endpoints even if ingest fails.
          })
        : Promise.resolve();

      // Tell "no such player" apart from "Chess.com / our API is having trouble".
      const profileFailure: { kind: 'not_found' | 'unavailable' | null } = { kind: null };
      // For a new player the profile is held back until the check passes, so it never shows next to the previous player's data.
      const profileResult = await runLoader(setProfileLoading, isNewPlayer ? () => {} : setProfile, async () => {
        try {
          return await services.fetchProfile(clean);
        } catch (e) {
          const notFound = e instanceof services.ApiRequestError && (e.status === 404 || e.status === 400);
          profileFailure.kind = notFound ? 'not_found' : 'unavailable';
          return null;
        }
      });
      if (gen !== generation.current) return;

      if (!profileResult) {
        setAllLoading(false);
        setIsRefreshing(false);
        // Searching for a new name while another player is on screen: stay on that player and
        // show the error in the search box. Otherwise go back to the landing page.
        const keepCurrentPlayer = isNewPlayer && previousPlayer !== null;
        activeUsernameRef.current = keepCurrentPlayer ? previousPlayer : null;
        if (!keepCurrentPlayer) setActiveUsername(null);
        setError(
          profileFailure.kind === 'unavailable'
            ? "Couldn't reach Chess.com right now. Please try again in a moment."
            : "Couldn't find that Chess.com username. Please check the spelling and try again."
        );
        return;
      }

      if (isNewPlayer) {
        // The player exists: now switch to the dashboard, starting from skeletons.
        clearData();
        setProfile(profileResult);
        setActiveUsername(clean);
        setAllLoading(true);
        setProfileLoading(false);
      }

      // The player exists. The caller can now do what should only happen for a real player, like putting it in the URL.
      options?.onVerified?.();

      await Promise.allSettled([
        ingest.then(() => loadDashboard(clean)),
        runLoader(setStatsLoading, setStats, () => services.fetchStats(clean)),
        runLoader(setOnlineStatusLoading, setOnlineStatus, () => services.fetchOnlineStatus(clean)),
        runLoader(setClubsLoading, setClubs, () => services.fetchClubs(clean)),
        runLoader(setTournamentsLoading, setTournaments, () => services.fetchTournaments(clean)),
        runLoader(setMatchesLoading, setMatches, () => services.fetchMatches(clean)),
        runLoader(setCurrentGamesLoading, setCurrentGames, () => services.fetchCurrentGames(clean)),
        loadGames(clean, timeClass, months),
      ]);

      if (gen === generation.current) setIsRefreshing(false);
    },
    [timeClass, months, runLoader, loadDashboard, loadGames, clearData, setAllLoading]
  );

  const clearPlayer = useCallback(() => {
    generation.current++;
    gamesRequest.current++;
    activeUsernameRef.current = null;
    setActiveUsername(null);
    setUsername('');
    setError(null);
    setIsRefreshing(false);
    setAllLoading(false);
    clearData();
  }, [clearData, setAllLoading]);

  const toMoveGames = useMemo(
    () => (currentGames && activeUsername ? services.filterToMoveGames(currentGames, activeUsername) : null),
    [currentGames, activeUsername]
  );

  const statsSummary = useMemo(() => computeStatsSummary(stats), [stats]);
  const puzzleRushSummary = useMemo(() => computePuzzleRushSummary(statsSummary), [statsSummary]);
  const ratingChart = useMemo(() => computeRatingChart(games), [games]);

  return {
    username,
    setUsername,
    activeUsername,
    isRefreshing,
    error,
    data,
    dashboardLoading,
    statsLoading,
    stats,
    profileLoading,
    profile,
    onlineStatus,
    onlineStatusLoading,
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
    clearPlayer,
    setError,
  };
}
