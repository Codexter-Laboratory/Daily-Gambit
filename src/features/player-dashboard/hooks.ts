import { useCallback, useMemo, useState } from 'react';
import type { DashboardResponse, GamesTimeClass } from './types';
import * as services from './services';
import {
  computeAttemptsChart,
  computePuzzleRushSummary,
  computeRatingChart,
  computeStatsSummary,
} from './derived';
import { toFriendlyErrorMessage } from '../../utils/errorMessage';

export function usePlayerDashboard() {
  const [username, setUsername] = useState('');
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [stats, setStats] = useState<unknown | null>(null);
  const [profile, setProfile] = useState<unknown | null>(null);
  const [onlineStatus, setOnlineStatus] = useState<unknown | null>(null);
  const [clubs, setClubs] = useState<unknown | null>(null);
  const [tournaments, setTournaments] = useState<unknown | null>(null);
  const [matches, setMatches] = useState<unknown | null>(null);
  const [currentGames, setCurrentGames] = useState<unknown | null>(null);
  const [toMoveGames, setToMoveGames] = useState<{ games: unknown[] } | null>(null);
  const [timeClass, setTimeClass] = useState<GamesTimeClass>('blitz');
  const [months, setMonths] = useState(6);
  const [games, setGames] = useState<Awaited<ReturnType<typeof services.fetchGames>> | null>(null);

  const [statsLoading, setStatsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [onlineStatusLoading, setOnlineStatusLoading] = useState(false);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [currentGamesLoading, setCurrentGamesLoading] = useState(false);
  const [toMoveGamesLoading, setToMoveGamesLoading] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);

  const loadDashboard = useCallback(async (nextUsername = username) => {
    setLoading(true);
    try {
      const json = await services.fetchDashboard(nextUsername);
      setData(json ?? null);
      return json;
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [username]);

  const loadStats = useCallback(async (nextUsername = username) => {
    setStatsLoading(true);
    try {
      const result = await services.fetchStats(nextUsername);
      setStats(result ?? null);
      return result;
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [username]);

  const loadProfile = useCallback(async (nextUsername = username) => {
    setProfileLoading(true);
    try {
      const result = await services.fetchProfile(nextUsername);
      setProfile(result ?? null);
      return result;
    } catch {
      setProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [username]);

  const loadOnlineStatus = useCallback(async (nextUsername = username) => {
    setOnlineStatusLoading(true);
    try {
      const result = await services.fetchOnlineStatus(nextUsername);
      setOnlineStatus(result ?? null);
    } catch {
      setOnlineStatus(null);
    } finally {
      setOnlineStatusLoading(false);
    }
  }, [username]);

  const loadClubs = useCallback(async (nextUsername = username) => {
    setClubsLoading(true);
    try {
      const result = await services.fetchClubs(nextUsername);
      setClubs(result ?? null);
    } catch {
      setClubs(null);
    } finally {
      setClubsLoading(false);
    }
  }, [username]);

  const loadTournaments = useCallback(async (nextUsername = username) => {
    setTournamentsLoading(true);
    try {
      const result = await services.fetchTournaments(nextUsername);
      setTournaments(result ?? null);
    } catch {
      setTournaments(null);
    } finally {
      setTournamentsLoading(false);
    }
  }, [username]);

  const loadMatches = useCallback(async (nextUsername = username) => {
    setMatchesLoading(true);
    try {
      const result = await services.fetchMatches(nextUsername);
      setMatches(result ?? null);
    } catch {
      setMatches(null);
    } finally {
      setMatchesLoading(false);
    }
  }, [username]);

  const loadCurrentGames = useCallback(async (nextUsername = username) => {
    setCurrentGamesLoading(true);
    try {
      const result = await services.fetchCurrentGames(nextUsername);
      setCurrentGames(result ?? null);
    } catch {
      setCurrentGames(null);
    } finally {
      setCurrentGamesLoading(false);
    }
  }, [username]);

  const loadToMoveGames = useCallback(async (nextUsername = username) => {
    setToMoveGamesLoading(true);
    try {
      const result = await services.fetchToMoveGames(nextUsername);
      setToMoveGames(result ?? null);
    } catch (e) {
      console.error('To-move games error:', e);
      setToMoveGames(null);
    } finally {
      setToMoveGamesLoading(false);
    }
  }, [username]);

  const loadGames = useCallback(
    async (nextUsername = username, nextTimeClass = timeClass, nextMonths = months) => {
      setGamesLoading(true);
      setError(null);
      try {
        const result = await services.fetchGames(nextUsername, nextTimeClass, nextMonths);
        setGames(result ?? null);
      } catch (e) {
        setError(toFriendlyErrorMessage(e, 'Failed to load games.'));
        setGames(null);
      } finally {
        setGamesLoading(false);
      }
    },
    [username, timeClass, months]
  );

  const refreshAll = useCallback(
    async (nextUsername = username, options?: { withIngest?: boolean }) => {
      const clean = nextUsername.replace(/\s+/g, '').trim().toLowerCase();
      if (!clean) return;

      setError(null);
      setActiveUsername(clean);

      if (options?.withIngest) {
        try {
          await services.fetchIngest(clean);
        } catch {
          // Continue loading read endpoints even if ingest fails.
        }
      }

      try {
        const profileResult = await loadProfile(clean);

        if (!profileResult) {
          setActiveUsername(null);
          setError("Couldn't find that Chess.com username. Please check the spelling and try again.");
          return;
        }

        await Promise.allSettled([
          loadDashboard(clean),
          loadStats(clean),
          loadGames(clean, timeClass, months),
          loadOnlineStatus(clean),
          loadClubs(clean),
          loadTournaments(clean),
          loadMatches(clean),
          loadCurrentGames(clean),
          loadToMoveGames(clean),
        ]);
      } catch (e) {
        console.error('Data loading error:', e);
        setError('Failed to load data. Please try again.');
      }
    },
    [
      username,
      timeClass,
      months,
      loadProfile,
      loadDashboard,
      loadStats,
      loadGames,
      loadOnlineStatus,
      loadClubs,
      loadTournaments,
      loadMatches,
      loadCurrentGames,
      loadToMoveGames,
    ]
  );

  const statsSummary = useMemo(() => computeStatsSummary(stats), [stats]);
  const attemptsChart = useMemo(
    () => computeAttemptsChart(data, stats, statsSummary),
    [data, stats, statsSummary]
  );
  const puzzleRushSummary = useMemo(() => computePuzzleRushSummary(statsSummary), [statsSummary]);
  const ratingChart = useMemo(() => computeRatingChart(games), [games]);

  const isLoading =
    loading ||
    statsLoading ||
    gamesLoading ||
    profileLoading ||
    onlineStatusLoading ||
    clubsLoading ||
    tournamentsLoading ||
    matchesLoading ||
    currentGamesLoading ||
    toMoveGamesLoading;

  const hasUsername = username.trim().length > 0;

  return {
    username,
    setUsername,
    activeUsername,
    error,
    data,
    statsLoading,
    stats,
    profileLoading,
    profile,
    onlineStatus,
    clubsLoading,
    clubs,
    tournamentsLoading,
    tournaments,
    matchesLoading,
    matches,
    currentGamesLoading,
    currentGames,
    toMoveGamesLoading,
    toMoveGames,
    timeClass,
    setTimeClass,
    months,
    setMonths,
    games,
    statsSummary,
    attemptsChart,
    puzzleRushSummary,
    ratingChart,
    isLoading,
    hasUsername,
    loadDashboard,
    loadGames,
    refreshAll,
  };
}
