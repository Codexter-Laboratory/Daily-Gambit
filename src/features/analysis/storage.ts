import { get, set } from 'idb-keyval';
import type { AnalyzedGame } from '../../lib/analysis/types';

/**
 * Everything is stored in this browser (IndexedDB). It is a cache and a training log, not an
 * account: clearing site data resets it. Every call is wrapped, because storage can be blocked
 * (private windows, strict settings), and the app has to keep working without it.
 */

const VERSION = 1;

export type AnalysisCache = { v: number; games: Record<string, AnalyzedGame>; skipped: string[] };
export type TrainingLog = { v: number; /** puzzle id -> day it was solved (YYYY-MM-DD) */ solved: Record<string, string> };

const analysisKey = (user: string) => `dg:analysis:${user}`;
const trainingKey = (user: string) => `dg:training:${user}`;

async function read<T extends { v: number }>(key: string, empty: T): Promise<T> {
  try {
    const value = await get<T>(key);
    return value && value.v === VERSION ? value : empty;
  } catch {
    return empty;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await set(key, value);
  } catch {
    // Storage is unavailable or full: results stay in memory for this visit.
  }
}

export const emptyAnalysisCache = (): AnalysisCache => ({ v: VERSION, games: {}, skipped: [] });
export const emptyTrainingLog = (): TrainingLog => ({ v: VERSION, solved: {} });

export const loadAnalysisCache = (user: string) => read(analysisKey(user), emptyAnalysisCache());
export const saveAnalysisCache = (user: string, cache: AnalysisCache) => write(analysisKey(user), cache);
export const loadTrainingLog = (user: string) => read(trainingKey(user), emptyTrainingLog());
export const saveTrainingLog = (user: string, log: TrainingLog) => write(trainingKey(user), log);
