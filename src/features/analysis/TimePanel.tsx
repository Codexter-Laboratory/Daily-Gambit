import { Panel, StatCard } from '../../components';
import { timeStats } from '../../lib/analysis/timeStats';
import type { AnalyzedGame } from '../../lib/analysis/types';

/** How you use the clock, and what it costs you. Needs games with clock data (not daily games). */
export function TimePanel({ games }: { games: AnalyzedGame[] }) {
  const t = timeStats(games);
  if (games.length === 0) return null;
  if (t.games === 0) {
    return (
      <Panel title="Time management">
        <div className="muted insightEmpty">These games have no clock data (daily games don&apos;t record it). Analyse some blitz, rapid or bullet games to see this.</div>
      </Panel>
    );
  }
  const { normal, trouble } = t.seriousPer100;
  const max = Math.max(1, ...t.avgSpent.map((b) => b.seconds ?? 0));
  const verdict =
    normal !== null && trouble !== null
      ? trouble > normal * 1.5
        ? `You make ${trouble} serious errors per 100 moves in time trouble, against ${normal} with time. Playing faster early would pay off.`
        : `Time trouble doesn't change your accuracy much (${trouble} vs ${normal} errors per 100 moves).`
      : null;

  return (
    <div className="stack">
      <div className="statCards">
        <StatCard label="Moves in time trouble" value={`${t.troublePct}%`}>
          under 10% of your starting time
        </StatCard>
        <StatCard label="Errors with time" value={normal ?? '–'}>
          serious errors per 100 moves
        </StatCard>
        <StatCard label="Errors in time trouble" value={trouble ?? '–'}>
          serious errors per 100 moves
        </StatCard>
        <StatCard label="Lost on time" value={`${t.lostOnTime.games} of ${t.lostOnTime.losses}`}>
          losses by flag
        </StatCard>
      </div>
      <div className="grid2">
        <Panel title="Time per move">
          <ul className="anBars">
            {t.avgSpent.map((b) => (
              <li key={b.label}>
                <div className="anBarLabel">
                  <span>{b.label}</span>
                  <strong>{b.seconds === null ? '–' : `${b.seconds}s`}</strong>
                </div>
                <div className="anBarTrack" aria-hidden="true">
                  <div className="anBarFill anBarAccent" style={{ width: `${((b.seconds ?? 0) / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="What it means">
          <ul className="anInsights">
            {verdict ? <li>{verdict}</li> : <li>Not enough moves in time trouble to compare yet.</li>}
            {t.fastSeriousPct !== null ? (
              <li>
                {t.fastSeriousPct}% of your mistakes and blunders were played in 2 seconds or less.{' '}
                {t.fastSeriousPct >= 30 ? 'Slow down on forcing moves and captures.' : 'Most come from slower, harder decisions.'}
              </li>
            ) : null}
            {t.lostOnTime.games > 0 ? <li>{t.lostOnTime.games} of your {t.lostOnTime.losses} losses were on the clock.</li> : null}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
