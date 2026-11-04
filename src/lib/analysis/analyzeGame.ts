import { Chess, type Move } from 'chess.js';
import { openingFamily } from '../gameRecords';
import { MATE_CP, classifyLoss, moveAccuracy, winPercent } from './winProb';
import type { Engine, EngineEval, GameAnalysis, MoveError, Phase, PhaseStats, Side } from './types';

export const ENGINE_NAME = 'stockfish-17.1-lite';
/** Below this win chance the player was already losing, so the "mistake" is not a fair puzzle. */
const TRAINABLE_MIN_WIN = 30;

export type AnalyzeOptions = {
  depth: number;
  signal?: AbortSignal;
  /** Called after every position, so the UI can show a progress bar. */
  onProgress?: (done: number, total: number) => void;
};

export type AnalyzeInput = { gameId: string; pgn: string; username: string };

const emptyPhase = (): PhaseStats => ({ moves: 0, inaccuracy: 0, mistake: 0, blunder: 0 });

const PIECE_VALUE: Record<string, number> = { n: 3, b: 3, r: 5, q: 9 };

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

function toSan(fen: string, uci: string | null): string | null {
  if (!uci || uci.length < 4) return null;
  try {
    const move = new Chess(fen).move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    });
    return move.san;
  } catch {
    return null;
  }
}

/** Evaluation for a finished game: no engine needed, the result is known. */
function terminalEval(chess: Chess): EngineEval | null {
  if (chess.isCheckmate()) return { whiteCp: chess.turn() === 'w' ? -MATE_CP : MATE_CP, bestUci: null };
  if (chess.isGameOver()) return { whiteCp: 0, bestUci: null };
  return null;
}

/**
 * Runs the engine over every position of a game and reports the player's errors.
 * Returns null when the player is not in the game or the PGN cannot be read.
 */
export async function analyzeGame(
  input: AnalyzeInput,
  engine: Engine,
  options: AnalyzeOptions
): Promise<GameAnalysis | null> {
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

  // fens[i] is the position before half-move i; fens[history.length] is the final position.
  const fens = [history[0].before, ...history.map((m) => m.after)];
  const evals: EngineEval[] = [];
  for (let i = 0; i < fens.length; i++) {
    if (options.signal?.aborted) throw new DOMException('Analysis cancelled', 'AbortError');
    const terminal = i === fens.length - 1 ? terminalEval(new Chess(fens[i])) : null;
    evals.push(terminal ?? (await engine.evaluate(fens[i], options.depth)));
    options.onProgress?.(i + 1, fens.length);
  }

  const side = (c: 'w' | 'b'): Side => (c === 'w' ? 'white' : 'black');
  const errors: MoveError[] = [];
  const byPhase: Record<Phase, PhaseStats> = { opening: emptyPhase(), middlegame: emptyPhase(), endgame: emptyPhase() };
  const counts = { inaccuracy: 0, mistake: 0, blunder: 0 };
  let accuracySum = 0;
  let playerMoves = 0;

  history.forEach((move, ply) => {
    if (side(move.color) !== color) return;
    const sign = color === 'white' ? 1 : -1;
    const winBefore = winPercent(sign * evals[ply].whiteCp);
    const winAfter = winPercent(sign * evals[ply + 1].whiteCp);
    const winLoss = Math.max(0, winBefore - winAfter);
    const kind = classifyLoss(winLoss);
    const moveNumber = Math.floor(ply / 2) + 1;
    const phase = phaseOf(moveNumber, move.before);

    playerMoves += 1;
    accuracySum += moveAccuracy(winLoss);
    byPhase[phase].moves += 1;
    if (kind === 'ok') return;

    counts[kind] += 1;
    byPhase[phase][kind] += 1;
    const bestUci = evals[ply].bestUci;
    const bestSan = toSan(move.before, bestUci);
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
      winBefore: Math.round(winBefore * 10) / 10,
      winAfter: Math.round(winAfter * 10) / 10,
      winLoss: Math.round(winLoss * 10) / 10,
      kind,
      phase,
      opening,
      trainable: kind !== 'inaccuracy' && winBefore >= TRAINABLE_MIN_WIN && bestUci !== `${move.from}${move.to}${move.promotion ?? ''}`,
    });
  });

  return {
    gameId: input.gameId,
    color,
    opening,
    engine: ENGINE_NAME,
    depth: options.depth,
    analyzedAt: Date.now(),
    accuracy: playerMoves > 0 ? Math.round((accuracySum / playerMoves) * 10) / 10 : 0,
    playerMoves,
    counts,
    byPhase,
    evals: evals.map((e) => Math.max(-1500, Math.min(1500, Math.round(e.whiteCp)))),
    errors,
  };
}
