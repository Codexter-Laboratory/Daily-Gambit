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
  setTimeClass: (v: GamesTimeClass) => void;
  months: number;
  setMonths: (v: number) => void;
  ratingChart: RatingChartPoint[];
  gamesSummary: { games: number; win: number; loss: number; draw: number } | null;
  onCategoryChange: (timeClass: GamesTimeClass, months: number) => void;
  onLookbackChange: (timeClass: GamesTimeClass, months: number) => void;
};

const TIME_CLASS_OPTIONS: [GamesTimeClass, string][] = [
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

export function GamesRatingChart({
  timeClass,
  setTimeClass,
  months,
  setMonths,
  ratingChart,
  gamesSummary,
  onCategoryChange,
  onLookbackChange,
}: GamesRatingChartProps) {
  return (
    <Panel title="Rating history">
      <div className="row" style={{ marginBottom: 10 }}>
        <label className="muted" style={{ fontSize: 12 }}>Category</label>
        <select
          value={timeClass}
          onChange={(e) => {
            const next = e.target.value as GamesTimeClass;
            setTimeClass(next);
            onCategoryChange(next, months);
          }}
        >
          {TIME_CLASS_OPTIONS.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <label className="muted" style={{ fontSize: 12, marginLeft: 6 }}>Lookback</label>
        <select
          value={months}
          onChange={(e) => {
            const next = Number(e.target.value);
            setMonths(next);
            onLookbackChange(timeClass, next);
          }}
        >
          {[3, 6, 12, 24].map((m) => (
            <option key={m} value={m}>
              {m} mo
            </option>
          ))}
        </select>
      </div>

      <div className="metricTiles">
        <div className="metricTile">
          <div className="metricValue">{gamesSummary?.games ?? '–'}</div>
          <div className="metricLabel">Games</div>
        </div>
        <div className="metricTile">
          <div className="metricValue" style={{ color: 'var(--good)' }}>{gamesSummary?.win ?? '–'}</div>
          <div className="metricLabel">Wins</div>
        </div>
        <div className="metricTile">
          <div className="metricValue" style={{ color: 'var(--bad)' }}>{gamesSummary?.loss ?? '–'}</div>
          <div className="metricLabel">Losses</div>
        </div>
        <div className="metricTile">
          <div className="metricValue" style={{ color: 'var(--muted)' }}>{gamesSummary?.draw ?? '–'}</div>
          <div className="metricLabel">Draws</div>
        </div>
      </div>

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
              stroke="#34d399"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        Rating after each game in the last {months} months, from Chess.com game archives.
      </div>
    </Panel>
  );
}
