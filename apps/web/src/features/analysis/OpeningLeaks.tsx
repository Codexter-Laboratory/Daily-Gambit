import { Panel, TableScroll } from '../../components';
import { openingReport, type AnalyzedGame } from '@daily-gambit/core';

/** Openings ranked by how many points they cost you, with how many serious errors fall inside the opening. */
export function OpeningLeaks({ games }: { games: AnalyzedGame[] }) {
  const rows = openingReport(games).slice(0, 8);
  if (games.length === 0) return null;
  return (
    <Panel title="Opening leaks">
      {rows.length === 0 ? (
        <div className="muted insightEmpty">Play or analyse a few more games with the same opening to see patterns.</div>
      ) : (
        <>
          <div className="muted anNote">Ranked by points lost. Only openings with at least 2 games.</div>
          <TableScroll label="Opening leaks">
            <table className="anTable">
              <thead>
                <tr>
                  <th>Opening</th>
                  <th>Games</th>
                  <th>Score</th>
                  <th>Accuracy</th>
                  <th title="Mistakes and blunders inside the first 10 moves, per game">Early errors</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.opening}|${r.color}`}>
                    <td>
                      <span role="img" className={r.color === 'white' ? 'anDot anDotWhite' : 'anDot anDotBlack'} aria-label={r.color === 'white' ? 'as White' : 'as Black'} />
                      {r.opening}
                    </td>
                    <td>{r.games}</td>
                    <td className={r.scorePct < 40 ? 'anBad' : r.scorePct >= 60 ? 'anGood' : undefined}>{r.scorePct}%</td>
                    <td>{r.avgAccuracy}%</td>
                    <td>{r.openingErrorsPerGame}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </>
      )}
    </Panel>
  );
}
