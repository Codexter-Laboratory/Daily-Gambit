'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { LoadingState, SectionBoundary, Tabs } from '../../components';
import { ConversionPanel } from './ConversionPanel';
import { ErrorsByPhase } from './ErrorsByPhase';
import { GameReview } from './GameReview';
import { GamesTable } from './GamesTable';
import { Insights } from './Insights';
import { MistakePatterns } from './MistakePatterns';
import { OpeningExplorer } from './OpeningExplorer';
import { OpeningLeaks } from './OpeningLeaks';
import { RunPanel } from './RunPanel';
import { TimePanel } from './TimePanel';
import { TrainSection } from './TrainSection';
import { usePlayerAnalysis } from './usePlayerAnalysis';
import { useTraining } from './useTraining';

// Recharts and the chessboard are the heavy parts, so they load only when needed.
const AccuracyTrendChart = dynamic(() => import('./AccuracyTrendChart').then((m) => m.AccuracyTrendChart), {
  ssr: false,
  loading: () => <LoadingState title="Accuracy over your last games" message="Loading chart…" rows={4} />,
});

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'openings', label: 'Openings' },
  { id: 'mistakes', label: 'Mistakes' },
  { id: 'time', label: 'Time' },
  { id: 'games', label: 'Games' },
  { id: 'train', label: 'Train' },
] as const;
type TabId = (typeof TABS)[number]['id'];

/** Engine analysis for one player: overview, openings, mistakes, time, game review and training. */
export function AnalysisHub({ username }: { username: string }) {
  const analysis = usePlayerAnalysis(username);
  const training = useTraining(username, analysis.games);
  const { games } = analysis;
  const [tab, setTab] = useState<TabId>('overview');
  const [review, setReview] = useState<{ id: string; ply?: number } | null>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  const openReview = (id: string, ply?: number) => {
    setTab('games');
    setReview({ id, ply });
  };
  useEffect(() => {
    if (review) reviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [review]);

  const reviewed = review ? games.find((g) => g.meta.id === review.id) : undefined;
  const panel = (id: TabId, children: React.ReactNode) =>
    tab === id ? (
      <div role="tabpanel" id={`an-panel-${id}`} aria-labelledby={`an-tab-${id}`} className="stack">
        {children}
      </div>
    ) : null;

  return (
    <section className="stack" aria-label="Analysis">
      <div className="sectionHead">
        <h2 className="sectionTitle">Analysis</h2>
      </div>
      <RunPanel
        status={analysis.status}
        running={analysis.running}
        progress={analysis.progress}
        error={analysis.error}
        analysedCount={games.length}
        cacheReady={analysis.cacheReady}
        onRun={analysis.run}
        onCancel={analysis.cancel}
      />

      {games.length > 0 || training.deck.length > 0 ? (
        <>
          <Tabs label="Analysis sections" tabs={TABS} value={tab} onChange={setTab} idPrefix="an" />

          {panel(
            'overview',
            <>
              <Insights games={games} />
              <ConversionPanel games={games} onReview={openReview} />
              <AccuracyTrendChart games={games} />
            </>
          )}
          {panel(
            'openings',
            <>
              <OpeningLeaks games={games} />
              <OpeningExplorer games={games} />
            </>
          )}
          {panel(
            'mistakes',
            <>
              <MistakePatterns games={games} onReview={openReview} />
              <ErrorsByPhase games={games} />
            </>
          )}
          {panel('time', <TimePanel games={games} />)}
          {panel(
            'games',
            <>
              <div ref={reviewRef} />
              {reviewed ? (
                <SectionBoundary title="Game review">
                  <GameReview key={`${reviewed.meta.id}:${review?.ply ?? 'x'}`} game={reviewed} startPly={review?.ply} onClose={() => setReview(null)} />
                </SectionBoundary>
              ) : null}
              <GamesTable games={games} onReview={openReview} />
            </>
          )}
          {panel(
            'train',
            <SectionBoundary title="Daily Blunder Deck">
              <TrainSection
                deck={training.deck}
                solvedToday={training.solvedToday}
                streak={training.streak}
                onSolved={training.markSolved}
                onFailed={training.markFailed}
                retryCount={training.retryCount}
                analysedCount={games.length}
                onReview={openReview}
              />
            </SectionBoundary>
          )}
        </>
      ) : null}
    </section>
  );
}
