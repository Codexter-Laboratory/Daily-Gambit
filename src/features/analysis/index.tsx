'use client';

import dynamic from 'next/dynamic';
import { LoadingState, SectionBoundary } from '../../components';
import { ErrorsByPhase } from './ErrorsByPhase';
import { Insights } from './Insights';
import { OpeningLeaks } from './OpeningLeaks';
import { RunPanel } from './RunPanel';
import { TrainSection } from './TrainSection';
import { usePlayerAnalysis } from './usePlayerAnalysis';
import { useTraining } from './useTraining';

// Recharts and the chessboard are the heavy parts, so they load only when needed.
const AccuracyTrendChart = dynamic(() => import('./AccuracyTrendChart').then((m) => m.AccuracyTrendChart), {
  ssr: false,
  loading: () => <LoadingState title="Accuracy over your last games" message="Loading chart…" rows={4} />,
});

/** Engine analysis, openings, errors and training for one player. */
export function AnalysisHub({ username }: { username: string }) {
  const analysis = usePlayerAnalysis(username);
  const training = useTraining(username, analysis.games);
  const { games } = analysis;

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
      <Insights games={games} />
      <div className="grid2">
        <OpeningLeaks games={games} />
        <ErrorsByPhase games={games} />
      </div>
      <AccuracyTrendChart games={games} />
      <SectionBoundary title="Daily Blunder Deck">
        <TrainSection
          deck={training.deck}
          solvedToday={training.solvedToday}
          streak={training.streak}
          onSolved={training.markSolved}
          gameUrl={(id) => games.find((g) => g.meta.id === id)?.meta.url}
        />
      </SectionBoundary>
    </section>
  );
}
