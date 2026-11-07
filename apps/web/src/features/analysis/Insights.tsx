import { Panel, StatCard } from '../../components';
import { summarize, topInsights, type AnalyzedGame } from '@daily-gambit/core';

export function Insights({ games }: { games: AnalyzedGame[] }) {
  if (games.length === 0) return null;
  const s = summarize(games);
  const insights = topInsights(games);
  return (
    <>
      {insights.length > 0 ? (
        <Panel title="Fix this first">
          <ol className="anInsights">
            {insights.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ol>
        </Panel>
      ) : null}
      <div className="statCards">
        <StatCard label="Average accuracy" value={`${s.avgAccuracy}%`}>
          {s.games} games analysed
        </StatCard>
        <StatCard label="Blunders per game" value={s.perGame.blunder}>
          {s.totals.blunder} in total
        </StatCard>
        <StatCard label="Mistakes per game" value={s.perGame.mistake}>
          {s.totals.mistake} in total
        </StatCard>
        <StatCard label="Inaccuracies per game" value={s.perGame.inaccuracy}>
          {s.totals.inaccuracy} in total
        </StatCard>
      </div>
    </>
  );
}
