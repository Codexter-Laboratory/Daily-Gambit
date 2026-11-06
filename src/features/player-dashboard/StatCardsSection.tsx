import { StatCard } from '../../components';
import type { StatsSummary } from './derived';

type StatCardsSectionProps = {
  statsLoading: boolean;
  statsSummary: StatsSummary | null;
};

function SkeletonCard({ label }: { label: string }) {
  return (
    <StatCard label={label}>
      <div className="skeleton" style={{ height: 26, width: '60%', margin: '4px 0 8px' }} />
      <div className="skeleton" style={{ width: '80%' }} />
    </StatCard>
  );
}

export function StatCardsSection({ statsLoading, statsSummary }: StatCardsSectionProps) {
  const busy = statsLoading && statsSummary !== null;

  return (
    <div className={busy ? 'statCards statCardsBusy' : 'statCards'} aria-busy={statsLoading}>
      {statsSummary
        ? statsSummary.chess.map((c) => (
            <StatCard key={c.label} label={`${c.label} rating`} value={c.rating ?? '–'}>
              {c.games != null ? (
                <>
                  {c.games.toLocaleString()} games ·{' '}
                  <span>{c.win}W</span>{' '}
                  <span>{c.loss}L</span>{' '}
                  <span>{c.draw}D</span>
                </>
              ) : (
                'No rated games'
              )}
            </StatCard>
          ))
        : statsLoading
          ? ['Bullet', 'Blitz', 'Rapid', 'Daily'].map((label) => <SkeletonCard key={label} label={`${label} rating`} />)
          : (
            <StatCard label="Ratings">Ratings couldn&apos;t be loaded. Try refreshing.</StatCard>
          )}
    </div>
  );
}
