import { Panel } from '../../components';
import { phaseBreakdown, type AnalyzedGame } from '@daily-gambit/core';

const LABELS = { opening: 'Opening (moves 1–10)', middlegame: 'Middlegame', endgame: 'Endgame' } as const;

/** Serious errors (mistakes and blunders) per 100 moves, so phases of different lengths compare fairly. */
export function ErrorsByPhase({ games }: { games: AnalyzedGame[] }) {
  if (games.length === 0) return null;
  const rows = phaseBreakdown(games);
  const max = Math.max(1, ...rows.map((r) => r.errorsPer100));
  return (
    <Panel title="Where your errors happen">
      <div className="muted anNote">Mistakes and blunders per 100 moves.</div>
      <ul className="anBars">
        {rows.map((r) => (
          <li key={r.phase}>
            <div className="anBarLabel">
              <span>{LABELS[r.phase]}</span>
              <strong>{r.moves > 0 ? r.errorsPer100 : '–'}</strong>
            </div>
            <div className="anBarTrack" aria-hidden="true">
              <div className="anBarFill" style={{ width: `${(r.errorsPer100 / max) * 100}%` }} />
            </div>
            <div className="muted anBarMeta">
              {r.blunder} blunders · {r.mistake} mistakes · {r.moves} moves
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
