import { get, set } from 'idb-keyval';

/**
 * The training log (which puzzles were solved or failed, and when) is kept in this browser
 * (IndexedDB). It is not an account: clearing site data resets it. Every call is wrapped,
 * because storage can be blocked (private windows, strict settings), and the app has to keep
 * working without it.
 */

const TRAINING_VERSION = 1;

export type TrainingLog = {
  v: number;
  /** puzzle id -> day it was solved (YYYY-MM-DD) */
  solved: Record<string, string>;
  /** puzzle id -> day it was got wrong. Removed once solved; these come back first. */
  failed: Record<string, string>;
};

const trainingKey = (user: string) => `dg:training:${user}`;

async function read<T extends { v: number }>(key: string, empty: T): Promise<T> {
  try {
    const value = await get<T>(key);
    // Spread over the empty value, so fields added in later versions get their defaults.
    return value && value.v === empty.v ? { ...empty, ...value } : empty;
  } catch {
    return empty;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await set(key, value);
  } catch {
    // Storage is unavailable or full: progress stays in memory for this visit.
  }
}

export const emptyTrainingLog = (): TrainingLog => ({ v: TRAINING_VERSION, solved: {}, failed: {} });
export const loadTrainingLog = (user: string) => read(trainingKey(user), emptyTrainingLog());
export const saveTrainingLog = (user: string, log: TrainingLog) => write(trainingKey(user), log);
