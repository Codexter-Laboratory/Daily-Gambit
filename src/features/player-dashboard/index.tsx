import { useEffect, useRef } from 'react';
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
    statsLoading,
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
    isLoading,
    loadDashboard,
    loadGames,
    refreshAll,
  } = usePlayerDashboard();

  // Load the player named in ?u= once, so a dashboard link can be shared.
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!mounted || initialLoadDone.current) return;
    initialLoadDone.current = true;
    const fromUrl = new URLSearchParams(window.location.search).get('u')?.trim();
    if (fromUrl) {
      setUsername(fromUrl);
      refreshAll(fromUrl, { withIngest: true });
    }
  }, [mounted, refreshAll, setUsername]);

  // Keep ?u= in sync with the loaded player.
  useEffect(() => {
    if (!mounted) return;
    const url = new URL(window.location.href);
    if (activeUsername) url.searchParams.set('u', activeUsername);
    else url.searchParams.delete('u');
    window.history.replaceState(null, '', url);
  }, [mounted, activeUsername]);

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
      onSearch={(name) => refreshAll(name, { withIngest: true })}
      onRefreshCached={() => activeUsername && loadDashboard(activeUsername)}
      isLoading={isLoading}
      activeUsername={activeUsername}
      error={error}
    />
  );

  if (!activeUsername) {
    return <Hero>{search}</Hero>;
  }

  return (
    <div className="stack">
      {search}

      <PlayerProfileSection
        profileLoading={profileLoading}
        profile={profile as { avatar?: string; username: string; name?: string; title?: string; player_id: string; location?: string; joined: number; followers: number; status: string; fide?: number; is_streamer?: boolean; twitch_url?: string; last_online: number; url?: string } | null}
        onlineStatus={onlineStatus as { online: boolean } | null}
      />

      <StatCardsSection
        data={data}
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
          onCategoryChange={handleGamesFilterChange}
          onLookbackChange={handleGamesFilterChange}
        />

        <PuzzleRushChart
          puzzleRushSummary={puzzleRushSummary}
          attemptsChart={attemptsChart}
          data={data}
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

      <SnapshotsTable points={data?.puzzleRush?.points ?? []} />
    </div>
  );
}
