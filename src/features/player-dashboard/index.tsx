import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMounted } from '../../hooks/useMounted';
import { Panel } from '../../components';
import { usePlayerDashboard } from './hooks';
import { INVALID_USERNAME_MESSAGE, USERNAME_RE, normalizeUsername } from '../../lib/username';
import { Hero } from './Hero';
import { UsernameSearch } from './UsernameSearch';
import { StatCardsSection } from './StatCardsSection';
import { PlayerProfileSection } from './PlayerProfileSection';
import { PuzzleRushChart } from './PuzzleRushChart';
import { GamesRatingChart } from './GamesRatingChart';
import { CurrentGamesTable } from './CurrentGamesTable';
import { ToMoveGamesSection } from './ToMoveGamesSection';
import { ClubsSection } from './ClubsSection';
import { TournamentsSection } from './TournamentsSection';
import { TeamMatchesSection } from './TeamMatchesSection';
import { SnapshotsTable } from './SnapshotsTable';
import { GamesFilters } from './GamesFilters';
import { ActivityHeatmap, GameEndings, OpponentStrength, ResultsByColor, TopOpenings } from './GameInsights';

export function PlayerDashboard() {
  const mounted = useMounted();
  const {
    username,
    setUsername,
    activeUsername,
    error,
    data,
    dashboardLoading,
    statsLoading,
    gamesLoading,
    isRefreshing,
    profile,
    profileLoading,
    onlineStatus,
    clubs,
    clubsLoading,
    tournaments,
    tournamentsLoading,
    matches,
    matchesLoading,
    currentGames,
    currentGamesLoading,
    toMoveGames,
    toMoveGamesLoading,
    timeClass,
    setTimeClass,
    months,
    setMonths,
    games,
    statsSummary,
    puzzleRushSummary,
    ratingChart,
    loadGames,
    refreshAll,
    clearPlayer,
    setError,
  } = usePlayerDashboard();

  const router = useRouter();
  const searchParams = useSearchParams();
  const urlUsername = normalizeUsername(searchParams.get('u') ?? '') || null;

  // The ?u= param is the source of truth for which player is shown, so links can be
  // shared and Back/Forward move between players (or back to the landing page).
  const refreshAllRef = useRef(refreshAll);
  refreshAllRef.current = refreshAll;
  useEffect(() => {
    if (urlUsername) {
      setUsername(urlUsername);
      refreshAllRef.current(urlUsername, { withIngest: true });
    } else {
      clearPlayer();
    }
  }, [urlUsername, setUsername, clearPlayer]);

  const showPlayer = (name: string) => {
    const clean = normalizeUsername(name);
    if (!clean) return;
    if (!USERNAME_RE.test(clean)) {
      setError(INVALID_USERNAME_MESSAGE);
      return;
    }
    if (clean === urlUsername) {
      refreshAll(clean, { withIngest: true });
    } else {
      router.push(`/?u=${encodeURIComponent(clean)}`, { scroll: false });
    }
  };

  if (!mounted) {
    return <Panel>Loading…</Panel>;
  }

  const handleGamesFilterChange = (nextTimeClass: typeof timeClass, nextMonths: number) => {
    setTimeClass(nextTimeClass);
    setMonths(nextMonths);
    if (activeUsername) loadGames(activeUsername, nextTimeClass, nextMonths);
  };
  const gamePoints = games?.points ?? null;

  const search = (
    <UsernameSearch
      username={username}
      onUsernameChange={setUsername}
      onSearch={showPlayer}
      isLoading={isRefreshing}
      activeUsername={activeUsername}
      error={error}
    />
  );

  if (!activeUsername) {
    return <Hero>{search}</Hero>;
  }

  return (
    <div className="stack dashboardPage">
      {search}

      <PlayerProfileSection
        profileLoading={profileLoading}
        profile={profile as { avatar?: string; username: string; name?: string; title?: string; player_id: string; location?: string; joined: number; followers: number; status: string; fide?: number; is_streamer?: boolean; twitch_url?: string; last_online: number; url?: string } | null}
        onlineStatus={onlineStatus as { online: boolean } | null}
      />

      <StatCardsSection
        data={data}
        dashboardLoading={dashboardLoading}
        statsLoading={statsLoading}
        statsSummary={statsSummary}
      />

      <section className="stack" aria-label="Games">
        <GamesFilters timeClass={timeClass} months={months} onChange={handleGamesFilterChange} />

        <GamesRatingChart
          timeClass={timeClass}
          months={months}
          ratingChart={ratingChart}
          gamesSummary={games?.summary ?? null}
          missingMonths={games?.missingMonths ?? 0}
          loading={gamesLoading}
        />

        <ActivityHeatmap points={gamePoints} loading={gamesLoading} months={months} />

        <div className="grid2">
          <ResultsByColor points={gamePoints} loading={gamesLoading} />
          <OpponentStrength points={gamePoints} loading={gamesLoading} />
        </div>

        <div className="grid2">
          <GameEndings points={gamePoints} loading={gamesLoading} />
          <TopOpenings points={gamePoints} loading={gamesLoading} />
        </div>
      </section>

      <section className="stack" aria-label="Puzzle Rush">
        <div className="sectionHead">
          <h2 className="sectionTitle">Puzzle Rush</h2>
        </div>
        <div className="grid2">
          <PuzzleRushChart
            puzzleRushSummary={puzzleRushSummary}
            data={data}
            loading={statsLoading || dashboardLoading}
          />
          <SnapshotsTable points={data?.puzzleRush?.points ?? []} loading={dashboardLoading} />
        </div>
      </section>

      <ToMoveGamesSection
        toMoveGamesLoading={toMoveGamesLoading}
        toMoveGames={toMoveGames}
        hasUsername
      />

      <CurrentGamesTable
        currentGamesLoading={currentGamesLoading}
        currentGames={currentGames}
        username={activeUsername}
        hasUsername
      />

      <ClubsSection
        clubsLoading={clubsLoading}
        clubs={clubs}
        hasUsername
      />

      <div className="grid2">
        <TournamentsSection
          tournamentsLoading={tournamentsLoading}
          tournaments={tournaments}
          hasUsername
        />

        <TeamMatchesSection
          matchesLoading={matchesLoading}
          matches={matches}
          hasUsername
        />
      </div>

    </div>
  );
}
