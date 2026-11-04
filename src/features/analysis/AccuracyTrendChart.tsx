import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Panel } from '../../components';
import { accuracyTrend } from '../../lib/analysis/aggregate';
import type { AnalyzedGame } from '../../lib/analysis/types';

/** Accuracy of every analysed game, oldest to newest. Loaded lazily with the other Recharts charts. */
export function AccuracyTrendChart({ games }: { games: AnalyzedGame[] }) {
  const data = accuracyTrend(games).map((p, i) => ({ ...p, n: i + 1 }));
  if (data.length < 3) return null;
  return (
    <Panel title="Accuracy over your last games">
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="n" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={32} />
            <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              labelFormatter={(n) => `Game ${n} · ${data[Number(n) - 1]?.date ?? ''}`}
              contentStyle={{ background: '#171e2c', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 8, fontSize: 12 }}
              formatter={(value, name) => [name === 'accuracy' ? `${value}%` : value, name === 'accuracy' ? 'Accuracy' : 'Serious errors']}
            />
            <Line type="monotone" dataKey="accuracy" stroke="#60a5fa" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
