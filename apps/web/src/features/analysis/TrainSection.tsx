import { useEffect, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Panel, useBoardLabels } from '../../components';
import { isAcceptableAlternative, isBestMove, playMove, playSan, puzzleId, type MoveError, type PlayedMove } from '@daily-gambit/core';
import { getSharedStockfish } from './stockfishClient';

type Verdict = { kind: 'idle' } | { kind: 'checking' } | { kind: 'wrong'; san: string } | { kind: 'solved'; san: string; alternative: boolean };

type TrainSectionProps = {
  deck: MoveError[];
  solvedToday: ReadonlySet<string>;
  streak: number;
  onSolved: (id: string) => void;
  /** Called when a wrong move is played, so the puzzle comes back until it is solved. */
  onFailed: (id: string) => void;
  retryCount: number;
  /** Games analysed so far, to tell "nothing analysed" from "nothing to practise". */
  analysedCount: number;
  /** Opens the full game review at the position after the mistake. */
  onReview: (gameId: string, ply: number) => void;
};

const KIND_LABEL = { inaccuracy: 'inaccuracy', mistake: 'mistake', blunder: 'blunder' } as const;

export function TrainSection({ deck, solvedToday, streak, onSolved, onFailed, retryCount, analysedCount, onReview }: TrainSectionProps) {
  const [index, setIndex] = useState(0);
  const [fen, setFen] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict>({ kind: 'idle' });
  const [showAnswer, setShowAnswer] = useState(false);
  const current = deck[index] as MoveError | undefined;
  const currentId = current ? puzzleId(current) : null;
  const token = useRef(0);
  const [boardEl, setBoardEl] = useState<HTMLDivElement | null>(null);
  const [typed, setTyped] = useState('');
  const [typedError, setTypedError] = useState(false);
  useBoardLabels(boardEl);

  // Reset the board whenever the puzzle changes.
  useEffect(() => {
    token.current += 1;
    setFen(current?.fenBefore ?? null);
    setVerdict(solvedToday.has(currentId ?? '') ? { kind: 'solved', san: current?.bestSan ?? '', alternative: false } : { kind: 'idle' });
    setShowAnswer(false);
    setTyped('');
    setTypedError(false);
    // Only on puzzle change: solving it must not reset the board that shows the answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  if (deck.length === 0) {
    return (
      <Panel title="Daily Blunder Deck">
        <div className="muted insightEmpty">
          {analysedCount === 0
            ? 'Analyse some games and your biggest mistakes turn into a daily set of puzzles.'
            : 'No puzzles yet: your analysed games have no mistakes worth practising. Analyse more games, or a faster time control, to find some.'}{' '}
          Streak: {streak} {streak === 1 ? 'day' : 'days'}.
        </div>
      </Panel>
    );
  }

  const doneCount = deck.filter((e) => solvedToday.has(puzzleId(e))).length;
  const allDone = doneCount === deck.length;
  const locked = verdict.kind === 'solved' || verdict.kind === 'checking';

  /** Judges a legal move the player just made. */
  async function judge(move: PlayedMove) {
    if (!current || !currentId) return;
    const mine = ++token.current;
    setFen(move.fenAfter);

    if (isBestMove(current, move.uci)) {
      setVerdict({ kind: 'solved', san: move.san, alternative: false });
      onSolved(currentId);
      return;
    }

    // Not the engine's first choice. Ask the engine whether it is still a good move.
    setVerdict({ kind: 'checking' });
    try {
      const after = await Promise.race([
        getSharedStockfish().evaluate(move.fenAfter, 10),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15_000)),
      ]);
      if (token.current !== mine) return;
      if (isAcceptableAlternative(current, after.whiteCp)) {
        setVerdict({ kind: 'solved', san: move.san, alternative: true });
        onSolved(currentId);
        return;
      }
    } catch {
      if (token.current !== mine) return;
    }
    setVerdict({ kind: 'wrong', san: move.san });
    onFailed(currentId);
    // Put the piece back so the player can try again.
    setTimeout(() => {
      if (token.current === mine) setFen(current.fenBefore);
    }, 900);
  }

  function handleDrop(from: string, to: string | null): boolean {
    if (!current || !to || locked) return false;
    const move = playMove(current.fenBefore, from, to);
    if (!move) return false;
    void judge(move);
    return true;
  }

  function handleTyped(e: React.FormEvent) {
    e.preventDefault();
    if (!current || locked || !typed.trim()) return;
    const move = playSan(current.fenBefore, typed);
    if (!move) {
      setTypedError(true);
      return;
    }
    setTypedError(false);
    setTyped('');
    void judge(move);
  }

  const next = () => setIndex((i) => (i + 1) % deck.length);

  return (
    <Panel title="Daily Blunder Deck">
      <div className="anTrainHead">
        <span>
          <strong>{doneCount}</strong> of {deck.length} solved today
          {retryCount > 0 ? <span className="muted"> · {retryCount} to retry</span> : null}
        </span>
        <span className="anStreak" title="Days in a row with at least one puzzle solved">
          🔥 {streak} {streak === 1 ? 'day' : 'days'}
        </span>
      </div>

      {current && fen ? (
        <div className="anTrain">
          <div className="anBoard" ref={setBoardEl}>
            <Chessboard
              options={{
                // Letters, digits and dashes only: the board builds CSS selectors from this id.
                id: `puzzle-${current.gameId}-${current.ply}`.replace(/[^a-zA-Z0-9_-]/g, '-'),
                position: fen,
                boardOrientation: current.color,
                allowDragging: !locked,
                onPieceDrop: ({ sourceSquare, targetSquare }) => handleDrop(sourceSquare, targetSquare),
                darkSquareStyle: { backgroundColor: '#334155' },
                lightSquareStyle: { backgroundColor: '#94a3b8' },
              }}
            />
          </div>
          <div className="anTrainSide">
            <div className="muted">
              Puzzle {index + 1} of {deck.length} · move {current.moveNumber} · you played{' '}
              <strong>{current.san}</strong> ({KIND_LABEL[current.kind]}, −{Math.round(current.winLoss)}% win chance)
            </div>
            <p className="anPrompt">
              {current.color === 'white' ? 'White' : 'Black'} to move. Find a better move.
            </p>

            <form className="anMoveForm" onSubmit={handleTyped}>
              <label className="muted" htmlFor="puzzle-move">
                Or type your move
              </label>
              <div className="anRunRow anRepeatActions">
                <input
                  id="puzzle-move"
                  className="anInput"
                  value={typed}
                  onChange={(e) => {
                    setTyped(e.target.value);
                    setTypedError(false);
                  }}
                  placeholder="e.g. Nf3 or exd5"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  disabled={locked}
                  aria-invalid={typedError}
                  aria-describedby={typedError ? 'puzzle-move-error' : undefined}
                />
                <button type="submit" className="btn btnGhost" disabled={locked || !typed.trim()}>
                  Play
                </button>
              </div>
              {typedError ? (
                <span id="puzzle-move-error" className="anBad" role="alert">
                  That is not a legal move here.
                </span>
              ) : null}
            </form>

            <div role="status" aria-live="polite" className="anVerdict">
              {verdict.kind === 'checking' ? <span className="muted">Checking with Stockfish…</span> : null}
              {verdict.kind === 'wrong' ? <span className="anBad">{verdict.san} is not it. Try again.</span> : null}
              {verdict.kind === 'solved' ? (
                <span className="anGood">
                  {verdict.alternative ? `${verdict.san} works too. Stockfish’s choice was ${current.bestSan}.` : `Correct: ${current.bestSan}.`}
                </span>
              ) : null}
              {showAnswer && verdict.kind !== 'solved' ? <span>Best move: <strong>{current.bestSan}</strong></span> : null}
            </div>

            <div className="anRunRow">
              {verdict.kind !== 'solved' ? (
                <button type="button" className="btn btnGhost" onClick={() => setShowAnswer(true)}>
                  Show answer
                </button>
              ) : null}
              {deck.length > 1 ? (
                <button type="button" className={verdict.kind === 'solved' ? 'btn btnPrimary' : 'btn btnGhost'} onClick={next}>
                  Next puzzle
                </button>
              ) : null}
              <button type="button" className="btn btnGhost" onClick={() => onReview(current.gameId, current.ply + 1)}>
                Review full game
              </button>
            </div>
            {allDone ? <p className="anGood">Deck complete. Come back tomorrow for a new one.</p> : null}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
