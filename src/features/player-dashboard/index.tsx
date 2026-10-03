'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { LoadingState } from '../../components';
import { usePlayerDashboard } from './hooks';
import { usePlayerSearch } from './usePlayerSearch';
import { UsernameSearch } from './UsernameSearch';
import { StatCardsSection } from './StatCardsSection';
import { CurrentGamesTable } from './CurrentGamesTable';
import { ToMoveGamesSection } from './ToMoveGamesSection';
import { ClubsSection } from './ClubsSection';
import { TournamentsSection } from './TournamentsSection';
import { TeamMatchesSection } from './TeamMatchesSection';
import { SnapshotsTable } from './SnapshotsTable';
import { GamesFilters } from './GamesFilters';
import { ActivityHeatmap, GameEndings, OpponentStrength, ResultsByColor, TopOpenings } from './GameInsights';

// The two charts use Recharts, the heaviest dependency. next/dynamic keeps Recharts out of the
// first bundle: the page paints first and the charts arrive in one lazy chunk (both import from
// ./Charts). ssr: false because charts need the browser to measure their size, so the server
// sends the skeleton and the client swaps the chart in.
const GamesRatingChart = dynamic(() => import('./Charts').then((m) => m.GamesRatingChart), {
  ssr: false,
  loading: () => <LoadingState title="Rating history" message="Loading chart…" rows={5} />,
});
const PuzzleRushChart = dynamic(() => import('./Charts').then((m) => m.PuzzleRushChart), {
  ssr: false,
  loading: () => <LoadingState title="Puzzle Rush" message="Loading chart…" rows={5} />,
});

type PlayerDashboardProps = {
  /** The player this page is for (validated and lowercased by the page). */
  username: string;
  /** The profile card. A Server Component rendered by the page and passed down as a slot. */
  profile: ReactNode;
};

export function PlayerDashboard({ username, profile }: PlayerDashboardProps) {
  const {
    error,
    data,
    dashboardLoading,
    statsLoading,
    gamesLoading,
    isRefreshing,
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
  } = usePlayerDashboard(username);

  // The page remounts this component for every player (key={username}), so this runs once per player.
  const refreshAllRef = useRef(refreshAll);
  refreshAllRef.current = refreshAll;
  useEffect(() => {
    refreshAllRef.current(username, { withIngest: true });
  }, [username]);

  // Searching for the player already on screen is the Refresh button. Any other name is checked
  // first and only then opened (see usePlayerSearch).
  const {
    username: searchText,
    setUsername: setSearchText,
    error: searchError,
    isBusy,
    search: showPlayer,
  } = usePlayerSearch({
    currentUsername: username,
    onRefresh: (name) => refreshAll(name, { withIngest: true, forceFresh: true }),
  });

  const handleGamesFilterChange = (nextTimeClass: typeof timeClass, nextMonths: number) => {
    setTimeClass(nextTimeClass);
    setMonths(nextMonths);
    loadGames(username, nextTimeClass, nextMonths);
  };
  const gamePoints = games?.points ?? null;

  const search = (
    <UsernameSearch
      username={searchText}
      onUsernameChange={setSearchText}
      onSearch={showPlayer}
      isLoading={isRefreshing || isBusy}
      activeUsername={username}
      error={searchError ?? error}
    />
  );

  return (
    <div className="stack dashboardPage">
      {search}

      {profile}

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
        username={username}
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
