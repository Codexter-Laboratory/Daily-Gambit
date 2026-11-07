import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Panel } from '../../components';
import type { GamesTimeClass } from './types';
import type { RatingChartPoint } from './derived';

type GamesRatingChartProps = {
  timeClass: GamesTimeClass;
  months: number;
  ratingChart: RatingChartPoint[];
  gamesSummary: { games: number; win: number; loss: number; draw: number } | null;
  /** Months of the lookback that could not be loaded from Chess.com. */
  missingMonths?: number;
  loading: boolean;
};

export const TIME_CLASS_OPTIONS: [GamesTimeClass, string][] = [
  ['bullet', 'Bullet'],
  ['blitz', 'Blitz'],
  ['rapid', 'Rapid'],
  ['daily', 'Daily'],
  ['chess960', 'Chess960'],
  ['bughouse', 'Bughouse'],
  ['crazyhouse', 'Crazyhouse'],
  ['kingofthehill', 'King of the Hill'],
  ['threecheck', 'Three-check'],
  ['atomic', 'Atomic'],
];

const CHART_TOOLTIP_STYLE = {
  background: 'rgba(10,15,25,0.95)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
};

const AXIS_TICK = { fill: 'rgba(255,255,255,0.6)', fontSize: 11 };

const RESULT_TILES = [
  { key: 'games', label: 'Games', dot: null },
  { key: 'win', label: 'Wins', dot: 'win' },
  { key: 'draw', label: 'Draws', dot: 'draw' },
  { key: 'loss', label: 'Losses', dot: 'loss' },
] as const;

const fmtCount = (n: number) => n.toLocaleString();

export function lookbackLabel(months: number) {
  return months % 12 === 0 ? `${months / 12} year${months === 12 ? '' : 's'}` : `${months} months`;
}

export function GamesRatingChart({
  timeClass,
  months,
  ratingChart,
  gamesSummary,
  missingMonths = 0,
  loading,
}: GamesRatingChartProps) {
  return (
    <Panel title="Rating history" busy={loading && gamesSummary !== null}>
      {!gamesSummary && loading ? (
        <>
          <span className="srOnly" role="status">Loading rating history…</span>
          <div className="metricTiles">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 62, borderRadius: 10 }} />
            ))}
          </div>
          <div className="skeleton chartSkeleton" />
        </>
      ) : !gamesSummary ? (
        <div className="chartEmpty">Rating history couldn&apos;t be loaded. Try refreshing.</div>
      ) : (
        <>
      <div className="metricTiles">
        {RESULT_TILES.map((t) => (
          <div key={t.key} className="metricTile">
            <div className="metricValue">{fmtCount(gamesSummary[t.key])}</div>
            <div className="metricLabel">
              {t.dot ? <i className={`key key-${t.dot}`} aria-hidden="true" /> : null}
              {t.label}
            </div>
          </div>
        ))}
      </div>

          {gamesSummary.games === 0 ? (
            <div className="chartEmpty">
              No {TIME_CLASS_OPTIONS.find(([id]) => id === timeClass)?.[1] ?? timeClass} games in the last {lookbackLabel(months)}. Try another category or a longer lookback.
            </div>
          ) : (
      <div className="chartBox" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={ratingChart} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 25', 'dataMax + 25']}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(value: unknown) => [String(value ?? '-'), 'Rating']}
            />
            <Line
              type="monotone"
              dataKey="rating"
              stroke="var(--series-1)"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

          )}
        </>
      )}

      <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        Rating after each game in the last {lookbackLabel(months)}, from Chess.com game archives.
        {missingMonths > 0
          ? ` ${missingMonths} of those months could not be loaded, so the totals above are incomplete. Try refreshing.`
          : ''}
      </div>
    </Panel>
  );
}
