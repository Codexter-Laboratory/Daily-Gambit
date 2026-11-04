export type Side = 'white' | 'black';

/** Raw engine output for one position, as returned by the UCI `info score` line. */
export type UciScore = { cp: number } | { mate: number };

/** An evaluation normalised to White's point of view, so it never depends on whose turn it is. */
export type EngineEval = {
  /** Centipawns from White's point of view. Mates are clamped to ±MATE_CP. */
  whiteCp: number;
  /** Best move for the side to move, in UCI notation ("e2e4"), or null when there is none. */
  bestUci: string | null;
};

/** The only thing the analysis needs from a chess engine. Real engine in the browser, a fake in tests. */
export interface Engine {
  evaluate(fen: string, depth: number): Promise<EngineEval>;
}

export type MoveKind = 'ok' | 'inaccuracy' | 'mistake' | 'blunder';
export type Phase = 'opening' | 'middlegame' | 'endgame';

export type MoveError = {
  gameId: string;
  /** 0-based index of the half-move in the game. */
  ply: number;
  moveNumber: number;
  color: Side;
  fenBefore: string;
  san: string;
  bestUci: string;
  bestSan: string;
  /** Win chance (0-100) for the player before and after the move. */
  winBefore: number;
  winAfter: number;
  /** Win chance lost by this move, in percentage points. */
  winLoss: number;
  kind: Exclude<MoveKind, 'ok'>;
  phase: Phase;
  opening: string | null;
  /** True when the position makes a fair puzzle: the player was not already lost. */
  trainable: boolean;
};

export type PhaseStats = { moves: number; inaccuracy: number; mistake: number; blunder: number };

export type GameAnalysis = {
  gameId: string;
  color: Side;
  opening: string | null;
  engine: string;
  depth: number;
  analyzedAt: number;
  /** 0-100, higher is better. */
  accuracy: number;
  playerMoves: number;
  counts: { inaccuracy: number; mistake: number; blunder: number };
  byPhase: Record<Phase, PhaseStats>;
  /** White-POV centipawns after each half-move (index 0 is the start position), for the eval graph. */
  evals: number[];
  errors: MoveError[];
};

/** The bits of a game the reports need next to its analysis. */
export type GameMeta = {
  id: string;
  url: string;
  endTime: number;
  timeClass: string;
  color: Side;
  result: 'win' | 'loss' | 'draw' | 'other';
};

export type AnalyzedGame = { meta: GameMeta; analysis: GameAnalysis };
