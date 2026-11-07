import { z } from 'zod';
import type { AnalyzedGame } from '@daily-gambit/core';

export const USERNAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;
export const MAX_GAMES_PER_JOB = 100;

export const TimeClassSchema = z.enum(['bullet', 'blitz', 'rapid', 'daily']);
export type TimeClass = z.infer<typeof TimeClassSchema>;

/** POST /v1/analysis/jobs */
export const CreateJobSchema = z.object({
  username: z.string().regex(USERNAME_RE, 'Invalid Chess.com username.'),
  limit: z.number().int().min(1).max(MAX_GAMES_PER_JOB).default(25),
  timeClass: TimeClassSchema.optional(),
});
export type CreateJobInput = z.input<typeof CreateJobSchema>;
export type CreateJob = z.output<typeof CreateJobSchema>;

export type JobState = 'waiting' | 'active' | 'completed' | 'failed' | 'cancelled';

export type JobProgress = {
  phase: 'fetching' | 'analysing' | 'done';
  /** Games that still needed analysis when the job started. */
  total: number;
  done: number;
  /** Progress inside the games currently being analysed, as a fraction of one game (summed over engines). */
  inFlight: number;
  /** Set when a game has just been stored, so the client knows to refresh its list. */
  finishedGameId?: string;
};

export type JobStatus = {
  id: string;
  username: string;
  state: JobState;
  progress: JobProgress | null;
  error: string | null;
};

export type CreateJobResponse = { jobId: string; reused: boolean };

/** Server-sent events on GET /v1/analysis/jobs/:id/events */
export type JobEvent =
  | { type: 'status'; status: JobStatus }
  | { type: 'progress'; progress: JobProgress }
  | { type: 'done' }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

/** GET /v1/players/:username/analysis */
export type StoredAnalysisResponse = { username: string; games: AnalyzedGame[] };

export type ApiError = { error: string };

export const progressFraction = (p: JobProgress | null): number =>
  p && p.total > 0 ? Math.min(1, (p.done + p.inFlight) / p.total) : 0;
