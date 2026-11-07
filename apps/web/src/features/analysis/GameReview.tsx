'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Chessboard } from 'react-chessboard';
import { Panel } from '../../components';
import { MOTIF_LABELS, positionsFromSans, uciToSan, winPercent, type AnalyzedGame, type MoveKind } from '@daily-gambit/core';
import { EvalGraph } from './EvalGraph';
import { KIND_LABEL, KIND_MARK, RESULT_LABEL, formatClock, formatEval } from './format';

type GameReviewProps = {
  game: AnalyzedGame;
  /** Number of half-moves already played when the review opens. */
  startPly?: number;
  onClose: () => void;
};

const MARK_CLASS: Record<MoveKind, string> = { ok: '', inaccuracy: 'rvInacc', mistake: 'rvMistake', blunder: 'rvBlunder' };

export function GameReview({ game, startPly, onClose }: GameReviewProps) {
  const { analysis, meta } = game;
  const { plies, errors } = analysis;
  const fens = useMemo(() => positionsFromSans(plies.map((p) => p.san)), [plies]);
  const last = fens.length - 1;
  const firstError = errors.find((e) => e.kind !== 'inaccuracy');
  const [ply, setPly] = useState(Math.min(last, startPly ?? (firstError ? firstError.ply + 1 : 0)));
  const [flipped, setFlipped] = useState(false);
  const movesRef = useRef<HTMLOListElement>(null);

  // Keep the current move visible in the move list. Scrolls only the list, never the page.
  useEffect(() => {
    const list = movesRef.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!list || !current) return;
    const top = current.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + current.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top - list.clientHeight / 2;
    }
  }, [ply]);

  const go = (to: number) => setPly(Math.max(0, Math.min(last, to)));
  const seriousPlies = errors.filter((e) => e.kind !== 'inaccuracy').map((e) => e.ply + 1);
  const nextError = seriousPlies.find((p) => p > ply);
  const prevError = [...seriousPlies].reverse().find((p) => p < ply);

  const move = ply > 0 ? plies[ply - 1] : null;
  const error = ply > 0 ? errors.find((e) => e.ply === ply - 1) : undefined;
  const playedByYou = ply > 0 && (ply % 2 === 1) === (analysis.color === 'white');
  const bestSan = move && move.kind !== 'ok' ? uciToSan(fens[ply - 1], move.bestUci) : null;
  const showBest = move && move.kind !== 'ok' && move.bestUci && move.bestUci !== move.uci;

  const arrows = move
    ? [
        { startSquare: move.uci.slice(0, 2), endSquare: move.uci.slice(2, 4), color: move.kind === 'ok' ? 'rgba(148,163,184,0.7)' : 'rgba(251,113,133,0.9)' },
        ...(showBest ? [{ startSquare: move.bestUci!.slice(0, 2), endSquare: move.bestUci!.slice(2, 4), color: 'rgba(52,211,153,0.9)' }] : []),
      ]
    : [];
  const highlight = move ? { [move.uci.slice(0, 2)]: { backgroundColor: 'rgba(250,204,21,0.35)' }, [move.uci.slice(2, 4)]: { backgroundColor: 'rgba(250,204,21,0.45)' } } : {};

  const onKeyDown = (e: KeyboardEvent) => {
    const key = e.key;
    if (key === 'ArrowLeft') go(ply - 1);
    else if (key === 'ArrowRight') go(ply + 1);
    else if (key === 'Home') go(0);
    else if (key === 'End') go(last);
    else if (key === 'f') setFlipped((f) => !f);
    else return;
    e.preventDefault();
  };

  const winForYou = Math.round(winPercent((analysis.color === 'white' ? 1 : -1) * analysis.evals[ply]));
  const moveLabel = move ? `${Math.floor((ply - 1) / 2) + 1}${ply % 2 === 1 ? '.' : '...'} ${move.san}` : 'Starting position';

  return (
    <Panel
      title={
        <span className="rvTitle">
          Game review · vs {analysis.info.opponent}
          {analysis.info.opponentRating ? ` (${analysis.info.opponentRating})` : ''} · {RESULT_LABEL[meta.result]}
        </span>
      }
    >
      <div className="rv" tabIndex={0} onKeyDown={onKeyDown} aria-label="Game review. Left and right arrows step through moves, F flips the board.">
        <div className="rvTop muted">
          {analysis.opening ?? 'Unknown opening'} · you played {analysis.color} · accuracy {analysis.accuracy}%
          {analysis.info.termination ? ` · ${analysis.info.termination}` : ''}
          <span className="rvTopLinks">
            <a href={meta.url} target="_blank" rel="noreferrer">
              Open on Chess.com ↗
            </a>
            <button type="button" className="btn btnGhost" onClick={onClose}>
              Close
            </button>
          </span>
        </div>

        <EvalGraph game={game} ply={ply} onSelect={go} />

        <div className="rvMain">
          <div className="rvBoardCol">
            <div className="rvBoard" inert>
              <Chessboard
                options={{
                  id: `review-${meta.id}`.replace(/[^a-zA-Z0-9_-]/g, '-'),
                  position: fens[ply],
                  boardOrientation: flipped ? (analysis.color === 'white' ? 'black' : 'white') : analysis.color,
                  allowDragging: false,
                  arrows,
                  squareStyles: highlight,
                  darkSquareStyle: { backgroundColor: '#334155' },
                  lightSquareStyle: { backgroundColor: '#94a3b8' },
                }}
              />
            </div>
            <div className="rvControls" role="group" aria-label="Move navigation">
              <button type="button" className="btn btnGhost" onClick={() => go(0)} disabled={ply === 0} aria-label="First move">
                ⏮
              </button>
              <button type="button" className="btn btnGhost" onClick={() => go(ply - 1)} disabled={ply === 0} aria-label="Previous move">
                ◀
              </button>
              <button type="button" className="btn btnGhost" onClick={() => go(ply + 1)} disabled={ply === last} aria-label="Next move">
                ▶
              </button>
              <button type="button" className="btn btnGhost" onClick={() => go(last)} disabled={ply === last} aria-label="Last move">
                ⏭
              </button>
              <button type="button" className="btn btnGhost" onClick={() => setFlipped((f) => !f)} aria-label="Flip board">
                ⇅
              </button>
            </div>
            <div className="rvControls">
              <button type="button" className="btn btnGhost" disabled={prevError === undefined} onClick={() => prevError !== undefined && go(prevError)}>
                ← Previous mistake
              </button>
              <button type="button" className="btn btnPrimary" disabled={nextError === undefined} onClick={() => nextError !== undefined && go(nextError)}>
                Next mistake →
              </button>
            </div>
          </div>

          <div className="rvSide">
            <div className="rvNow" role="status" aria-live="polite">
              <div className="rvNowMove">
                {moveLabel}
                {move && move.kind !== 'ok' ? <span className={`rvBadge ${MARK_CLASS[move.kind]}`}>{KIND_MARK[move.kind]}</span> : null}
              </div>
              <div className="muted">
                Evaluation {formatEval(analysis.evals[ply])} · you have {winForYou}% winning chances
                {move ? ` · ${playedByYou ? 'your move' : "opponent's move"}` : ''}
              </div>
              {move && move.kind !== 'ok' ? (
                <div>
                  <strong>{KIND_LABEL[move.kind]}.</strong>{' '}
                  {showBest ? (
                    <>
                      Better was <strong className="anGood">{bestSan ?? move.bestUci}</strong>.
                    </>
                  ) : null}{' '}
                  {error && playedByYou ? <span className="muted">{MOTIF_LABELS[error.motif]}.</span> : null}
                </div>
              ) : null}
              {move && move.clock !== null ? (
                <div className="muted">
                  Clock {formatClock(move.clock)}
                  {move.spent !== null ? ` · took ${move.spent}s` : ''}
                </div>
              ) : null}
            </div>

            <ol className="rvMoves" aria-label="Moves" ref={movesRef}>
              {Array.from({ length: Math.ceil(plies.length / 2) }, (_, row) => (
                <li key={row}>
                  <span className="rvNum">{row + 1}.</span>
                  {[row * 2, row * 2 + 1].map((i) =>
                    plies[i] ? (
                      <button
                        key={i}
                        type="button"
                        className={`rvMove ${MARK_CLASS[plies[i].kind]} ${ply === i + 1 ? 'rvCurrent' : ''}`}
                        aria-current={ply === i + 1}
                        onClick={() => go(i + 1)}
                      >
                        {plies[i].san}
                        <small>{KIND_MARK[plies[i].kind]}</small>
                      </button>
                    ) : (
                      <span key={i} />
                    )
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </Panel>
  );
}
