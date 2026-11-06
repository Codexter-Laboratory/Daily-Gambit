import { useState } from 'react';
import { Panel, TableScroll } from '../../components';
import { openingExplorer } from '../../lib/analysis/openingExplorer';
import type { AnalyzedGame, Side } from '../../lib/analysis/types';
import { formatPath } from './format';

/** Walk through your own repertoire move by move: what you play, what opponents answer, and how it scores. */
export function OpeningExplorer({ games }: { games: AnalyzedGame[] }) {
  const [color, setColor] = useState<Side>('white');
  const [path, setPath] = useState<string[]>([]);
  if (games.length === 0) return null;

  const node = openingExplorer(games, color, path);
  const yourTurn = node.turn === color;
  const switchColor = (c: Side) => {
    setColor(c);
    setPath([]);
  };

  return (
    <Panel title="Opening explorer">
      <div className="anRunRow anNote">
        <div className="anSeg" role="group" aria-label="Colour">
          {(['white', 'black'] as const).map((c) => (
            <button key={c} type="button" className={color === c ? 'anSegBtn anSegActive' : 'anSegBtn'} aria-pressed={color === c} onClick={() => switchColor(c)}>
              As {c === 'white' ? 'White' : 'Black'}
            </button>
          ))}
        </div>
        <span className="muted">
          {node.games} {node.games === 1 ? 'game' : 'games'} · score {node.scorePct}%
        </span>
      </div>

      <nav className="anCrumbs" aria-label="Moves so far">
        <button type="button" className="anCrumb" onClick={() => setPath([])} disabled={path.length === 0}>
          Start
        </button>
        {path.map((san, i) => (
          <button key={i} type="button" className="anCrumb" onClick={() => setPath(path.slice(0, i + 1))} disabled={i === path.length - 1}>
            {i % 2 === 0 ? `${i / 2 + 1}. ` : ''}
            {san}
          </button>
        ))}
      </nav>

      {node.moves.length === 0 ? (
        <div className="muted insightEmpty">
          {path.length === 0 ? `No games as ${color} yet.` : `Your games end here: ${formatPath(path)}.`}
        </div>
      ) : (
        <TableScroll label="Moves played from this position">
          <table className="anTable">
            <thead>
              <tr>
                <th>{yourTurn ? 'Your move' : 'Opponent replies'}</th>
                <th>Games</th>
                <th>Score</th>
                <th title="Average engine win chance for you after this move">Win chance</th>
                <th title="Games where this move was a mistake or blunder">Errors</th>
              </tr>
            </thead>
            <tbody>
              {node.moves.map((m) => (
                <tr key={m.san}>
                  <td>
                    <button type="button" className="anMoveBtn" onClick={() => setPath([...path, m.san])}>
                      {path.length % 2 === 0 ? `${path.length / 2 + 1}. ` : `${Math.floor(path.length / 2) + 1}... `}
                      {m.san}
                    </button>
                  </td>
                  <td>{m.games}</td>
                  <td className={m.scorePct < 40 ? 'anBad' : m.scorePct >= 60 ? 'anGood' : undefined}>{m.scorePct}%</td>
                  <td>{m.avgWinPct}%</td>
                  <td className={m.seriousErrors > 0 ? 'anBad' : undefined}>{m.seriousErrors || '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
    </Panel>
  );
}
