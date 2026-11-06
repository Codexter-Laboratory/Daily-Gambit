import { useMemo, useState } from 'react';
import { Panel, TableScroll } from '../../components';
import type { AnalyzedGame } from '../../lib/analysis/types';
import { RESULT_LABEL } from './format';

type SortKey = 'newest' | 'accuracy' | 'errors';
const PAGE = 15;

const serious = (g: AnalyzedGame) => g.analysis.counts.mistake + g.analysis.counts.blunder;

/** Every analysed game. Sort by lowest accuracy to find the games worth a proper look. */
export function GamesTable({ games, onReview }: { games: AnalyzedGame[]; onReview: (gameId: string, ply?: number) => void }) {
  const [sort, setSort] = useState<SortKey>('newest');
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => {
    const copy = [...games];
    if (sort === 'accuracy') copy.sort((a, b) => a.analysis.accuracy - b.analysis.accuracy);
    else if (sort === 'errors') copy.sort((a, b) => serious(b) - serious(a) || a.analysis.accuracy - b.analysis.accuracy);
    else copy.sort((a, b) => b.meta.endTime - a.meta.endTime);
    return copy;
  }, [games, sort]);

  if (games.length === 0) return null;

  return (
    <Panel title="Your analysed games">
      <div className="anRunRow anNote">
        <span className="muted">Open any game to step through it with the engine&apos;s verdict on every move.</span>
        <label className="anSelect">
          <span className="muted">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort games">
            <option value="newest">Newest</option>
            <option value="accuracy">Lowest accuracy</option>
            <option value="errors">Most errors</option>
          </select>
        </label>
      </div>
      <TableScroll label="Analysed games">
        <table className="anTable">
          <thead>
            <tr>
              <th>Date</th>
              <th>Result</th>
              <th>Opponent</th>
              <th>Opening</th>
              <th>Accuracy</th>
              <th title="Blunders / mistakes / inaccuracies">B / M / I</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, shown).map((g) => (
              <tr key={g.meta.id}>
                <td className="anNoWrap">{new Date(g.meta.endTime * 1000).toISOString().slice(0, 10)}</td>
                <td className={g.meta.result === 'win' ? 'anGood' : g.meta.result === 'loss' ? 'anBad' : undefined}>
                  <span role="img" className={g.analysis.color === 'white' ? 'anDot anDotWhite' : 'anDot anDotBlack'} aria-label={`as ${g.analysis.color}`} />
                  {RESULT_LABEL[g.meta.result]}
                </td>
                <td>
                  {g.analysis.info.opponent}
                  {g.analysis.info.opponentRating ? <span className="muted"> {g.analysis.info.opponentRating}</span> : null}
                </td>
                <td>{g.analysis.opening ?? '–'}</td>
                <td>{g.analysis.accuracy}%</td>
                <td className="anNoWrap">
                  {g.analysis.counts.blunder} / {g.analysis.counts.mistake} / {g.analysis.counts.inaccuracy}
                </td>
                <td>
                  <button type="button" className="btn btnGhost" onClick={() => onReview(g.meta.id)}>
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
      {shown < rows.length ? (
        <button type="button" className="btn btnGhost anMore" onClick={() => setShown((n) => n + PAGE)}>
          Show more ({rows.length - shown} left)
        </button>
      ) : null}
    </Panel>
  );
}
