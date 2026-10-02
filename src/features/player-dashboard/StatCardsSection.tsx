import { StatCard } from '../../components';
import type { DashboardResponse } from './types';
import type { StatsSummary } from './derived';

type StatCardsSectionProps = {
  data: DashboardResponse | null;
  statsLoading: boolean;
  statsSummary: StatsSummary | null;
};

export function StatCardsSection({ data, statsLoading, statsSummary }: StatCardsSectionProps) {
  const streak = data?.puzzleRush.streak;

  return (
    <div className="statCards">
      {statsLoading && !statsSummary
        ? ['Bullet', 'Blitz', 'Rapid', 'Daily'].map((label) => (
            <StatCard key={label} label={label}>
              <div className="skeleton" style={{ height: 26, width: '60%', margin: '4px 0 8px' }} />
              <div className="skeleton" style={{ width: '80%' }} />
            </StatCard>
          ))
        : statsSummary?.chess.map((c) => (
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
          ))}

      <StatCard label="🔥 Puzzle Rush streak" value={`${streak?.current ?? 0}d`}>
        Best: {streak?.best ?? 0} days
        {streak?.endingDate ? <> · Last: {streak.endingDate}</> : null}
      </StatCard>
    </div>
  );
}
