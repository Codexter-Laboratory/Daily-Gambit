import { Chessboard } from 'react-chessboard';
import { Panel } from '../../components';
import { MOTIF_LABELS, PIECE_LABELS, motifBreakdown, pieceBreakdown, repeatedMistakes, type CountRow } from '../../lib/analysis/patterns';
import type { AnalyzedGame } from '../../lib/analysis/types';

function Bars<T extends string>({ rows, label }: { rows: CountRow<T>[]; label: (k: T) => string }) {
  return (
    <ul className="anBars">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="anBarLabel">
            <span>{label(r.key)}</span>
            <strong>
              {r.count} · {r.pct}%
            </strong>
          </div>
          <div className="anBarTrack" aria-hidden="true">
            <div className="anBarFill" style={{ width: `${r.pct}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

type Props = { games: AnalyzedGame[]; onReview: (gameId: string, ply?: number) => void };

/** What kind of mistakes you make, with which pieces, and the exact ones you keep repeating. */
export function MistakePatterns({ games, onReview }: Props) {
  if (games.length === 0) return null;
  const motifs = motifBreakdown(games);
  const pieces = pieceBreakdown(games);
  const repeats = repeatedMistakes(games).slice(0, 4);

  return (
    <div className="stack">
      <div className="grid2">
        <Panel title="What kind of mistakes">
          {motifs.length === 0 ? <div className="muted insightEmpty">No mistakes or blunders found. Impressive.</div> : <Bars rows={motifs} label={(k) => MOTIF_LABELS[k]} />}
        </Panel>
        <Panel title="Which piece you move when you go wrong">
          {pieces.length === 0 ? <div className="muted insightEmpty">Nothing to show yet.</div> : <Bars rows={pieces} label={(k) => PIECE_LABELS[k]} />}
        </Panel>
      </div>

      <Panel title="Mistakes you keep repeating">
        {repeats.length === 0 ? (
          <div className="muted insightEmpty">No position has gone wrong the same way twice yet. Analyse more games to find habits.</div>
        ) : (
          <ul className="anRepeats">
            {repeats.map((r) => (
              <li key={`${r.fenBefore}|${r.san}`} className="anRepeat">
                <div className="anRepeatBoard" aria-hidden="true">
                  <Chessboard
                    options={{
                      id: `rep-${r.examples[0].gameId}-${r.examples[0].ply}`.replace(/[^a-zA-Z0-9_-]/g, '-'),
                      position: r.fenBefore,
                      boardOrientation: r.color,
                      allowDragging: false,
                      showNotation: false,
                      arrows: [{ startSquare: r.examples[0].bestUci.slice(0, 2), endSquare: r.examples[0].bestUci.slice(2, 4), color: 'rgba(52,211,153,0.9)' }],
                      darkSquareStyle: { backgroundColor: '#334155' },
                      lightSquareStyle: { backgroundColor: '#94a3b8' },
                    }}
                  />
                </div>
                <div className="anRepeatBody">
                  <div>
                    You played <strong className="anBad">{r.san}</strong> here in <strong>{r.count}</strong> games, losing about {r.avgLoss}% win chance each time.
                  </div>
                  <div>
                    Better: <strong className="anGood">{r.bestSan}</strong>
                    {r.opening ? <span className="muted"> · {r.opening}</span> : null}
                  </div>
                  <div className="anRunRow anRepeatActions">
                    {r.examples.slice(0, 3).map((e, i) => (
                      <button key={`${e.gameId}-${e.ply}`} type="button" className="btn btnGhost" onClick={() => onReview(e.gameId, e.ply + 1)}>
                        Game {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
