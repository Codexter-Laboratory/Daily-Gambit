import type { AnalyzedGame, MoveError, MoveKind, Phase, PlyInfo, Side } from './types';

/** Builders for tests. Every field has a sensible default, so a test only states what it cares about. */
export function makeError(gameId: string, ply: number, winLoss: number, over: Partial<MoveError> = {}): MoveError {
  return {
    gameId, ply, moveNumber: Math.floor(ply / 2) + 1, color: 'white', fenBefore: `fen-${gameId}-${ply}`, san: 'a3', bestUci: 'e2e4', bestSan: 'e4',
    winBefore: 60, winAfter: 60 - winLoss, winLoss, kind: winLoss >= 30 ? 'blunder' : 'mistake', phase: 'middlegame', opening: 'Sicilian Defense',
    motif: 'positional', piece: 'p', clock: null, spent: null, timeTrouble: false, trainable: true, ...over,
  };
}

export type GameOptions = {
  opening?: string;
  color?: Side;
  result?: 'win' | 'loss' | 'draw';
  ending?: string;
  accuracy?: number;
  errors?: MoveError[];
  phase?: Phase;
  endTime?: number;
  sans?: string[];
  kinds?: MoveKind[];
  clocks?: (number | null)[];
  base?: number;
  peakWin?: number;
  lowWin?: number;
  turningPly?: number | null;
  evals?: number[];
};

export function makeGame(id: string, o: GameOptions = {}): AnalyzedGame {
  const color = o.color ?? 'white';
  const errors = o.errors ?? [];
  const mistakes = errors.filter((e) => e.kind === 'mistake').length;
  const blunders = errors.filter((e) => e.kind === 'blunder').length;
  const phase = o.phase ?? 'middlegame';
  const byPhase = { opening: { moves: 10, inaccuracy: 0, mistake: 0, blunder: 0 }, middlegame: { moves: 20, inaccuracy: 0, mistake: 0, blunder: 0 }, endgame: { moves: 5, inaccuracy: 0, mistake: 0, blunder: 0 } };
  byPhase[phase].mistake += mistakes;
  byPhase[phase].blunder += blunders;
  const sans = o.sans ?? [];
  const plies: PlyInfo[] = sans.map((san, i) => ({
    san, uci: 'a1a1', kind: o.kinds?.[i] ?? 'ok', bestUci: null, clock: o.clocks?.[i] ?? null, spent: null,
  }));
  return {
    meta: { id, url: `https://chess.com/game/${id}`, endTime: o.endTime ?? 1_700_000_000, timeClass: 'blitz', color, result: o.result ?? 'win', ending: o.ending ?? 'resignation' },
    analysis: {
      gameId: id, color, opening: o.opening ?? 'Sicilian Defense', engine: 't', depth: 1, analyzedAt: 0, accuracy: o.accuracy ?? 80, playerMoves: 35,
      counts: { inaccuracy: 0, mistake: mistakes, blunder: blunders }, byPhase, evals: o.evals ?? [], errors, plies,
      info: { opponent: 'opp', opponentRating: 1500, playerRating: 1500, date: '2026.11.04', timeControl: o.base ? { base: o.base, inc: 0 } : null, termination: null },
      peakWin: o.peakWin ?? 60, lowWin: o.lowWin ?? 40, turningPly: o.turningPly ?? null,
    },
  };
}
