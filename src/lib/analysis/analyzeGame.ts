import { Chess, type Move } from 'chess.js';
import { openingFamily } from '../gameRecords';
import { isTimeTrouble, parseClocks, parseTimeControl, timeSpent } from './clock';
import { detectMotif } from './motifs';
import { uciToSan } from './notation';
import { MATE_CP, classifyLoss, moveAccuracy, winPercent } from './winProb';
import type { Engine, EngineEval, GameAnalysis, GameInfo, MoveError, MoveKind, Phase, PhaseStats, PieceLetter, PlyInfo, Side } from './types';

export const ENGINE_NAME = 'stockfish-17.1-lite';
/** Below this win chance the player was already losing, so the "mistake" is not a fair puzzle. */
const TRAINABLE_MIN_WIN = 30;
/** A swing at least this big (win chance points) counts as the turning point of a game. */
const TURNING_POINT_MIN = 20;

export type AnalyzeOptions = {
  depth: number;
  signal?: AbortSignal;
  /** Called after every position, so the UI can show a progress bar. */
  onProgress?: (done: number, total: number) => void;
};

export type AnalyzeInput = { gameId: string; pgn: string; username: string };

const emptyPhase = (): PhaseStats => ({ moves: 0, inaccuracy: 0, mistake: 0, blunder: 0 });
const PIECE_VALUE: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 };
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Opening: first 10 moves. Endgame: little material left. Everything else is middlegame. */
export function phaseOf(moveNumber: number, fen: string): Phase {
  if (moveNumber <= 10) return 'opening';
  const board = fen.split(' ')[0];
  let material = 0;
  for (const ch of board) material += PIECE_VALUE[ch.toLowerCase()] ?? 0;
  return material <= 26 ? 'endgame' : 'middlegame';
}

function sideOfPlayer(chess: Chess, username: string): Side | null {
  const u = username.toLowerCase();
  const headers = chess.header();
  if (headers.White?.toLowerCase() === u) return 'white';
  if (headers.Black?.toLowerCase() === u) return 'black';
  return null;
}

/** Evaluation for a finished game: no engine needed, the result is known. */
function terminalEval(chess: Chess): EngineEval | null {
  if (chess.isCheckmate()) return { whiteCp: chess.turn() === 'w' ? -MATE_CP : MATE_CP, bestUci: null };
  if (chess.isGameOver()) return { whiteCp: 0, bestUci: null };
  return null;
}

function readInfo(headers: Record<string, string | null>, color: Side): GameInfo {
  const num = (v: string | null | undefined) => (v && Number.isFinite(Number(v)) ? Number(v) : null);
  const mine = color === 'white' ? 'White' : 'Black';
  const theirs = color === 'white' ? 'Black' : 'White';
  return {
    opponent: headers[theirs] ?? '?',
    opponentRating: num(headers[`${theirs}Elo`]),
    playerRating: num(headers[`${mine}Elo`]),
    date: headers.UTCDate ?? headers.Date ?? null,
    timeControl: parseTimeControl(headers.TimeControl),
    termination: headers.Termination ?? null,
  };
}

/**
 * Runs the engine over every position of a game and reports the player's errors.
 * Returns null when the player is not in the game or the PGN cannot be read.
 */
export async function analyzeGame(input: AnalyzeInput, engine: Engine, options: AnalyzeOptions): Promise<GameAnalysis | null> {
  const chess = new Chess();
  try {
    chess.loadPgn(input.pgn);
  } catch {
    return null;
  }
  const color = sideOfPlayer(chess, input.username);
  if (!color) return null;

  const history: Move[] = chess.history({ verbose: true });
  if (history.length === 0) return null;
  const opening = openingFamily(chess.header().ECOUrl ?? undefined);
  const info = readInfo(chess.header(), color);
  const clocks = parseClocks(input.pgn);
  const hasClocks = clocks.length >= history.length;

  // fens[i] is the position before half-move i; fens[history.length] is the final position.
  const fens = [history[0].before, ...history.map((m) => m.after)];
  const evals: EngineEval[] = [];
  for (let i = 0; i < fens.length; i++) {
    if (options.signal?.aborted) throw new DOMException('Analysis cancelled', 'AbortError');
    const terminal = i === fens.length - 1 ? terminalEval(new Chess(fens[i])) : null;
    evals.push(terminal ?? (await engine.evaluate(fens[i], options.depth)));
    options.onProgress?.(i + 1, fens.length);
  }

  const sideOf = (c: 'w' | 'b'): Side => (c === 'w' ? 'white' : 'black');
  const sign = color === 'white' ? 1 : -1;
  const errors: MoveError[] = [];
  const plies: PlyInfo[] = [];
  const byPhase: Record<Phase, PhaseStats> = { opening: emptyPhase(), middlegame: emptyPhase(), endgame: emptyPhase() };
  const counts = { inaccuracy: 0, mistake: 0, blunder: 0 };
  let accuracySum = 0;
  let playerMoves = 0;
  let biggestSwing = 0;
  let turningPly: number | null = null;

  history.forEach((move, ply) => {
    const mover = sideOf(move.color);
    const moverSign = mover === 'white' ? 1 : -1;
    const winBefore = winPercent(moverSign * evals[ply].whiteCp);
    const winAfter = winPercent(moverSign * evals[ply + 1].whiteCp);
    const winLoss = Math.max(0, winBefore - winAfter);
    const kind: MoveKind = classifyLoss(winLoss);

    const clock = hasClocks ? clocks[ply] : null;
    const prevClock = hasClocks ? (ply >= 2 ? clocks[ply - 2] : info.timeControl?.base ?? null) : null;
    const spent = timeSpent(prevClock, clock, info.timeControl?.inc ?? 0);
    plies.push({ san: move.san, uci: `${move.from}${move.to}${move.promotion ?? ''}`, kind, bestUci: evals[ply].bestUci, clock, spent });

    if (mover !== color) return;

    const moveNumber = Math.floor(ply / 2) + 1;
    const phase = phaseOf(moveNumber, move.before);
    playerMoves += 1;
    accuracySum += moveAccuracy(winLoss);
    byPhase[phase].moves += 1;
    if (winLoss >= TURNING_POINT_MIN && winLoss > biggestSwing) {
      biggestSwing = winLoss;
      turningPly = ply;
    }
    if (kind === 'ok') return;

    counts[kind] += 1;
    byPhase[phase][kind] += 1;
    const bestUci = evals[ply].bestUci;
    const bestSan = uciToSan(move.before, bestUci);
    if (!bestUci || !bestSan) return;

    errors.push({
      gameId: input.gameId,
      ply,
      moveNumber,
      color,
      fenBefore: move.before,
      san: move.san,
      bestUci,
      bestSan,
      winBefore: round1(winBefore),
      winAfter: round1(winAfter),
      winLoss: round1(winLoss),
      kind,
      phase,
      opening,
      motif: detectMotif({
        fenBefore: move.before,
        fenAfter: move.after,
        played: { piece: move.piece, captured: move.captured },
        bestUci,
        cpBefore: sign * evals[ply].whiteCp,
        cpAfter: sign * evals[ply + 1].whiteCp,
      }),
      piece: move.piece as PieceLetter,
      clock,
      spent,
      timeTrouble: isTimeTrouble(clock, info.timeControl),
      trainable: kind !== 'inaccuracy' && winBefore >= TRAINABLE_MIN_WIN && bestUci !== `${move.from}${move.to}${move.promotion ?? ''}`,
    });
  });

  const wins = evals.map((e) => winPercent(sign * e.whiteCp));
  return {
    gameId: input.gameId,
    color,
    opening,
    engine: ENGINE_NAME,
    depth: options.depth,
    analyzedAt: Date.now(),
    accuracy: playerMoves > 0 ? round1(accuracySum / playerMoves) : 0,
    playerMoves,
    counts,
    byPhase,
    evals: evals.map((e) => Math.max(-1500, Math.min(1500, Math.round(e.whiteCp)))),
    errors,
    plies,
    info,
    peakWin: round1(Math.max(...wins)),
    lowWin: round1(Math.min(...wins)),
    turningPly,
  };
}
