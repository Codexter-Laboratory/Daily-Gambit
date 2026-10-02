import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Panel } from '../../components';
import type { AttemptsChartPoint } from './derived';
import type { PuzzleRushSummary } from './derived';
import type { DashboardResponse } from './types';

type PuzzleRushChartProps = {
  puzzleRushSummary: PuzzleRushSummary | null;
  attemptsChart: AttemptsChartPoint[];
  data: DashboardResponse | null;
};

const CHART_TOOLTIP_STYLE = {
  background: 'rgba(10,15,25,0.95)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
};

function tooltipFormatter(value: unknown, name: string | undefined): [string, string] {
  const nameStr = String(name ?? '');
  const displayValue = String(value ?? '-');
  if (nameStr === 'attemptsDelta') return [displayValue, 'Daily Attempts'];
  if (nameStr === 'scoreDelta') return [displayValue, 'Daily Score'];
  if (nameStr === 'totalAttempts') return [displayValue, 'Total Attempts'];
  if (nameStr === 'totalScore') return [displayValue, 'Total Score'];
  return [displayValue, nameStr || 'Unknown'];
}

const METRICS: { key: keyof PuzzleRushSummary; label: string; color: string; suffix?: string }[] = [
  { key: 'dailyAttempts', label: 'Daily attempts', color: 'var(--accent)' },
  { key: 'dailyScore', label: 'Daily score', color: 'var(--good)' },
  { key: 'bestScore', label: 'Best score', color: 'var(--warn)' },
  { key: 'accuracy', label: 'Accuracy', color: 'var(--violet)', suffix: '%' },
];

const AXIS_TICK = { fill: 'rgba(255,255,255,0.6)', fontSize: 11 };

export function PuzzleRushChart({ puzzleRushSummary, attemptsChart, data }: PuzzleRushChartProps) {
  const days = data?.puzzleRush?.points?.length ?? 0;

  return (
    <Panel title="Puzzle Rush">
      <div className="metricTiles">
        {METRICS.map((m) => {
          const value = puzzleRushSummary?.[m.key];
          return (
            <div key={m.key} className="metricTile">
              <div className="metricValue" style={{ color: m.color }}>
                {value != null ? `${value}${m.suffix ?? ''}` : '–'}
              </div>
              <div className="metricLabel">{m.label}</div>
            </div>
          );
        })}
      </div>

      <div className="chartBox" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={attemptsChart} margin={{ top: 5, right: 0, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis yAxisId="attempts" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis yAxisId="score" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value: unknown, name: unknown) =>
                tooltipFormatter(value, typeof name === 'string' ? name : undefined)
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
            <Line
              yAxisId="attempts"
              type="monotone"
              dataKey="attemptsDelta"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              name="Daily Attempts"
            />
            <Line
              yAxisId="score"
              type="monotone"
              dataKey="scoreDelta"
              stroke="#34d399"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              name="Daily Score"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        {!puzzleRushSummary
          ? 'Loading Puzzle Rush data…'
          : days > 1
            ? `${days} days of saved snapshots. A new one is saved each day you look this player up.`
            : 'Only today is saved so far. The chart fills in as you look this player up on more days.'}
      </div>
    </Panel>
  );
}
