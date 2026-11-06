import { winPercent } from '../../lib/analysis/winProb';
import type { AnalyzedGame } from '../../lib/analysis/types';

const W = 600;
const H = 120;

type EvalGraphProps = { game: AnalyzedGame; ply: number; onSelect: (ply: number) => void };

/**
 * Who is winning, move by move, as the chance White wins. The line crossing the middle is a
 * change of fortune. Red dots are your mistakes and blunders. Click anywhere to jump there.
 */
export function EvalGraph({ game, ply, onSelect }: EvalGraphProps) {
  const { evals, errors, color } = game.analysis;
  const n = evals.length - 1;
  if (n < 1) return null;

  const x = (i: number) => (i / n) * W;
  const y = (cp: number) => H - (winPercent(cp) / 100) * H;
  const line = evals.map((cp, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(cp).toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const serious = errors.filter((e) => e.kind !== 'inaccuracy');

  return (
    <svg
      className="rvGraph"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Evaluation graph. You played ${color}. ${serious.length} mistakes or blunders are marked in red.`}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onSelect(Math.max(0, Math.min(n, Math.round(((e.clientX - r.left) / r.width) * n))));
      }}
    >
      <rect width={W} height={H} fill="var(--rv-black)" />
      <path d={area} fill="var(--rv-white)" />
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="var(--border-strong)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      {serious.map((e) => (
        <circle key={e.ply} cx={x(e.ply + 1)} cy={y(evals[e.ply + 1])} r="3.5" fill="var(--bad)" vectorEffect="non-scaling-stroke" />
      ))}
      <line x1={x(ply)} x2={x(ply)} y1="0" y2={H} stroke="var(--warn)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
