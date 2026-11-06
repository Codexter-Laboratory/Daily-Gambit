import { Panel, StatCard } from '../../components';
import { conversion } from '../../lib/analysis/conversion';
import type { AnalyzedGame } from '../../lib/analysis/types';

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–');

/** Do you win the games you should win, and save the ones you should lose? */
export function ConversionPanel({ games, onReview }: { games: AnalyzedGame[]; onReview: (gameId: string, ply?: number) => void }) {
  if (games.length === 0) return null;
  const c = conversion(games);
  return (
    <div className="stack">
      <div className="statCards">
        <StatCard label="Winning positions converted" value={pct(c.winning.converted, c.winning.games)}>
          {c.winning.converted} of {c.winning.games} games you were clearly winning
        </StatCard>
        <StatCard label="Wins thrown away" value={c.winning.thrown}>
          clearly winning, but not a win
        </StatCard>
        <StatCard label="Bad positions saved" value={pct(c.losing.saved, c.losing.games)}>
          {c.losing.saved} of {c.losing.games} games you were clearly losing
        </StatCard>
        <StatCard label="Turning points" value={c.turningPoints}>
          games decided by one big move
        </StatCard>
      </div>
      {c.thrownGames.length > 0 ? (
        <Panel title="Games you should have won">
          <ul className="anList">
            {c.thrownGames.slice(0, 6).map((g) => (
              <li key={g.meta.id} className="anListRow">
                <span>
                  {new Date(g.meta.endTime * 1000).toISOString().slice(0, 10)} · vs {g.analysis.info.opponent} · peak {Math.round(g.analysis.peakWin)}% winning chances, finished {g.meta.result}
                </span>
                <button type="button" className="btn btnGhost" onClick={() => onReview(g.meta.id, g.analysis.turningPly !== null ? g.analysis.turningPly + 1 : undefined)}>
                  See where
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
