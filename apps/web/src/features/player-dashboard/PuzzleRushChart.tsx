import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Panel } from '../../components';
import type { PuzzleRushSummary } from './derived';
import type { DashboardResponse } from './types';

type PuzzleRushChartProps = {
  puzzleRushSummary: PuzzleRushSummary | null;
  data: DashboardResponse | null;
  loading: boolean;
};

const CHART_TOOLTIP_STYLE = {
  background: 'rgba(10,15,25,0.95)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
};

const METRICS: { key: keyof PuzzleRushSummary; label: string }[] = [
  { key: 'bestScore', label: 'Best score' },
  { key: 'dailyAttempts', label: 'Daily attempts' },
  { key: 'dailyScore', label: 'Daily score' },
  { key: 'avgScorePerAttempt', label: 'Avg score / attempt' },
];

const AXIS_TICK = { fill: 'rgba(255,255,255,0.6)', fontSize: 11 };

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function PuzzleRushChart({ puzzleRushSummary, data, loading }: PuzzleRushChartProps) {
  const points = data?.puzzleRush?.points ?? [];
  const bestSeries = points.filter((p) => p.bestScore != null).map((p) => ({ date: p.date, best: p.bestScore }));
  const attemptsSeries = points
    .filter((p) => p.attemptsDelta != null)
    .map((p) => ({ date: p.date, attempts: p.attemptsDelta }));
  const firstDay = points[0]?.date ?? null;

  if (!puzzleRushSummary && loading) {
    return (
      <Panel title="Puzzle Rush">
        <span className="srOnly" role="status">Loading Puzzle Rush data…</span>
        <div className="metricTiles">
          {METRICS.map((m) => (
            <div key={m.key} className="skeleton" style={{ height: 62, borderRadius: 10 }} />
          ))}
        </div>
        <div className="skeleton chartSkeleton" />
      </Panel>
    );
  }

  const hasPuzzleRush =
    puzzleRushSummary != null &&
    (puzzleRushSummary.dailyAttempts != null ||
      puzzleRushSummary.bestScore != null ||
      points.some((p) => p.attemptsTotal != null || p.bestScore != null));

  if (!hasPuzzleRush) {
    return (
      <Panel title="Puzzle Rush" busy={loading}>
        <div className="chartEmpty">
          {puzzleRushSummary
            ? "This player hasn't played Puzzle Rush yet, so there's nothing to chart."
            : "Puzzle Rush stats couldn't be loaded. Try refreshing."}
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Puzzle Rush" busy={loading}>
      <div className="metricTiles">
        {METRICS.map((m) => {
          const value = puzzleRushSummary?.[m.key];
          return (
            <div key={m.key} className="metricTile">
              <div className="metricValue">{value != null ? value : '–'}</div>
              <div className="metricLabel">{m.label}</div>
            </div>
          );
        })}
      </div>

      {bestSeries.length >= 2 ? (
        <figure className="miniChart">
          <figcaption>Best score over time</figcaption>
          <div className="chartBox" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bestSeries} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: unknown) => [String(v ?? '–'), 'Best score']} />
                <Line
                  type="stepAfter"
                  dataKey="best"
                  stroke="var(--series-1)"
                  strokeWidth={2}
                  dot={bestSeries.length <= 30 ? { r: 4, strokeWidth: 2, stroke: 'var(--chart-surface)', fill: 'var(--series-1)' } : false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </figure>
      ) : null}

      {attemptsSeries.length >= 1 ? (
        <figure className="miniChart">
          <figcaption>Attempts per day</figcaption>
          <div className="chartBox" style={{ height: 150 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attemptsSeries} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  formatter={(v: unknown) => [String(v ?? '–'), 'Attempts']}
                />
                <Bar dataKey="attempts" fill="var(--series-1)" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>
      ) : null}

      {bestSeries.length < 2 && attemptsSeries.length === 0 ? (
        <div className="chartEmpty chartEmptyShort">
          Chess.com doesn&apos;t publish past Puzzle Rush results, so Daily Gambit records them itself, one
          snapshot a day. The charts appear once two days are recorded.
        </div>
      ) : null}

      <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        {firstDay
          ? `${points.length} day${points.length === 1 ? '' : 's'} recorded since ${formatDate(firstDay)}. New days are saved automatically.`
          : 'Nothing recorded yet. The first snapshot is saved the next time this player is looked up.'}
      </div>
    </Panel>
  );
}
