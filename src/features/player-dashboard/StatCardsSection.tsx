import { StatCard } from '../../components';
import type { DashboardResponse } from './types';
import type { StatsSummary } from './derived';

type StatCardsSectionProps = {
  data: DashboardResponse | null;
  dashboardLoading: boolean;
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

export function StatCardsSection({ data, dashboardLoading, statsLoading, statsSummary }: StatCardsSectionProps) {
  const streak = data?.puzzleRush.streak;
  const busy = (statsLoading && statsSummary !== null) || (dashboardLoading && data !== null);

  return (
    <div className={busy ? 'statCards statCardsBusy' : 'statCards'} aria-busy={statsLoading || dashboardLoading}>
      {statsSummary
        ? statsSummary.chess.map((c) => (
            <StatCard key={c.label} label={`${c.label} rating`} value={c.rating ?? '–'}>
              {c.games != null ? (
                <>
                  {c.games.toLocaleString()} games ·{' '}
                  <span style={{ color: 'var(--good)' }}>{c.win}W</span>{' '}
                  <span style={{ color: 'var(--bad)' }}>{c.loss}L</span>{' '}
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

      {!data && dashboardLoading ? (
        <SkeletonCard label="🔥 Puzzle Rush streak" />
      ) : (
        <StatCard label="🔥 Puzzle Rush streak" value={`${streak?.current ?? 0}d`}>
          Best: {streak?.best ?? 0} days
          {streak?.endingDate ? <> · Last: {streak.endingDate}</> : null}
        </StatCard>
      )}
    </div>
  );
}
