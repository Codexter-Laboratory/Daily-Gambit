import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMounted } from '../../hooks/useMounted';
import { Panel } from '../../components';
import { usePlayerDashboard } from './hooks';
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
    attemptsChart,
    puzzleRushSummary,
    ratingChart,
    loadGames,
    refreshAll,
    clearPlayer,
  } = usePlayerDashboard();

  const router = useRouter();
  const searchParams = useSearchParams();
  const urlUsername = searchParams.get('u')?.replace(/\s+/g, '').toLowerCase() || null;

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
    const clean = name.replace(/\s+/g, '').toLowerCase();
    if (!clean) return;
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
    if (activeUsername) loadGames(activeUsername, nextTimeClass, nextMonths);
  };

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

      <div className="grid2">
        <GamesRatingChart
          timeClass={timeClass}
          setTimeClass={setTimeClass}
          months={months}
          setMonths={setMonths}
          ratingChart={ratingChart}
          gamesSummary={games?.summary ?? null}
          loading={gamesLoading}
          onCategoryChange={handleGamesFilterChange}
          onLookbackChange={handleGamesFilterChange}
        />

        <PuzzleRushChart
          puzzleRushSummary={puzzleRushSummary}
          attemptsChart={attemptsChart}
          data={data}
          loading={statsLoading || dashboardLoading}
        />
      </div>

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

      <SnapshotsTable points={data?.puzzleRush?.points ?? []} loading={dashboardLoading} />
    </div>
  );
}
