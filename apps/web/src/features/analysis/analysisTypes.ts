import type { AnalyzedGame } from '@daily-gambit/core';

export type AnalysisStatus = 'idle' | 'loading-games' | 'starting-engine' | 'analyzing' | 'done' | 'cancelled' | 'error';

export type RunOptions = { limit: number; timeClass?: 'bullet' | 'blitz' | 'rapid' | 'daily' };

export type AnalysisProgress = {
  /** Games finished so far, out of the ones that still needed analysis. */
  done: number;
  total: number;
  /** How far through the games in progress the engine is, in games (can be above 1 when several run at once). */
  currentFraction: number;
};

/** What the analysis hooks hand to the UI. The browser and the API versions return the same shape. */
export type PlayerAnalysis = {
  games: AnalyzedGame[];
  cacheReady: boolean;
  status: AnalysisStatus;
  running: boolean;
  progress: AnalysisProgress | null;
  error: string | null;
  run: (options: RunOptions) => Promise<void>;
  cancel: () => void;
};
