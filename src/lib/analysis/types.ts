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

/** What kind of error a mistake was. A heuristic read of the position, not engine output. */
export type Motif = 'missed-mate' | 'allowed-mate' | 'hung-piece' | 'missed-capture' | 'missed-tactic' | 'positional';
export type PieceLetter = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
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
  motif: Motif;
  /** The piece that moved. */
  piece: PieceLetter;
  /** Seconds left on the player's clock after the move, and seconds the move took. Null when the game has no clock data. */
  clock: number | null;
  spent: number | null;
  /** True when the clock was low (see isTimeTrouble). */
  timeTrouble: boolean;
  /** True when the position makes a fair puzzle: the player was not already lost. */
  trainable: boolean;
};

/** One half-move, for the game review board and the time statistics. */
export type PlyInfo = {
  san: string;
  uci: string;
  /** Quality of the move for whoever played it (both sides are rated). */
  kind: MoveKind;
  /** The engine's preferred move in this position, UCI. Null for the final position. */
  bestUci: string | null;
  /** Seconds left on the mover's clock after the move, and seconds the move took. */
  clock: number | null;
  spent: number | null;
};

export type TimeControl = { base: number; inc: number };

export type GameInfo = {
  opponent: string;
  opponentRating: number | null;
  playerRating: number | null;
  /** PGN UTC date, "2026.11.04". */
  date: string | null;
  timeControl: TimeControl | null;
  /** PGN Termination text, e.g. "hikaru won by resignation". */
  termination: string | null;
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
  plies: PlyInfo[];
  info: GameInfo;
  /** Highest and lowest win chance (0-100) the player had at any point. Shows won and lost positions. */
  peakWin: number;
  lowWin: number;
  /** The move that swung the game the most against the player, if it swung it at all. */
  turningPly: number | null;
};

/** The bits of a game the reports need next to its analysis. */
export type GameMeta = {
  id: string;
  url: string;
  endTime: number;
  timeClass: string;
  color: Side;
  result: 'win' | 'loss' | 'draw' | 'other';
  /** How the game ended: "timeout", "resignation", "checkmate", ... */
  ending: string;
};

export type AnalyzedGame = { meta: GameMeta; analysis: GameAnalysis };
