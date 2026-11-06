import { UnrecoverableError, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { analyzeGame, type Engine } from '@daily-gambit/core';
import type { JobProgress } from '@daily-gambit/contracts';
import type { Config } from '../config.js';
import { ChessComError, type AnalysisGame, type GamesSource } from '../services/chesscom.js';
import type { AnalysisRepo } from '../services/repo.js';
import { CANCELLED, activeKey, cancelKey, type AnalysisJobData } from './queue.js';

export type DisposableEngine = Engine & { dispose(): void };

export type ProcessorDeps = {
  config: Pick<Config, 'ENGINE_DEPTH' | 'ENGINES_PER_JOB'>;
  source: GamesSource;
  repo: AnalysisRepo;
  redis: Redis;
  startEngine: () => Promise<DisposableEngine>;
};

const PROGRESS_INTERVAL_MS = 300;
const CANCEL_POLL_MS = 500;

/**
 * One analysis job: list the player's recent games, skip those already stored, then run the
 * engine over the rest (in parallel across several engine processes), storing each game as it finishes.
 */
export function createProcessor(deps: ProcessorDeps) {
  return async function processAnalysis(job: Job<AnalysisJobData>): Promise<void> {
    const { username, limit, timeClass } = job.data;
    const jobId = job.id as string;
    const controller = new AbortController();
    const cancelPoll = setInterval(() => {
      deps.redis.exists(cancelKey(jobId)).then((n) => n && controller.abort(), () => undefined);
    }, CANCEL_POLL_MS);
    const engines: DisposableEngine[] = [];

    const state: JobProgress = { phase: 'fetching', total: 0, done: 0, inFlight: 0 };
    let lastReport = 0;
    const report = async (force = false, finishedGameId?: string) => {
      const now = Date.now();
      if (!force && now - lastReport < PROGRESS_INTERVAL_MS) return;
      lastReport = now;
      await job.updateProgress({ ...state, finishedGameId });
    };

    try {
      await report(true);

      let games: AnalysisGame[];
      try {
        games = await deps.source.recentGames({ username, limit, timeClass, signal: controller.signal });
      } catch (e) {
        // A player that does not exist will not exist on the second try either.
        if (e instanceof ChessComError && e.status === 404) throw new UnrecoverableError('Chess.com player not found.');
        throw e;
      }
      if (controller.signal.aborted) throw new UnrecoverableError(CANCELLED);

      const existing = await deps.repo.existingIds(username, games.map((g) => g.id));
      const todo = games.filter((g) => !existing.has(g.id));
      state.phase = 'analysing';
      state.total = todo.length;
      await report(true);

      if (todo.length > 0) {
        const count = Math.min(deps.config.ENGINES_PER_JOB, todo.length);
        for (let i = 0; i < count; i++) engines.push(await deps.startEngine());

        const fractions = engines.map(() => 0);
        let next = 0;
        const run = async (engine: DisposableEngine, slot: number) => {
          while (!controller.signal.aborted) {
            const game = todo[next++];
            if (!game) return;
            const analysis = await analyzeGame({ gameId: game.id, pgn: game.pgn, username }, engine, {
              depth: deps.config.ENGINE_DEPTH,
              signal: controller.signal,
              onProgress: (done, total) => {
                fractions[slot] = done / total;
                state.inFlight = fractions.reduce((a, b) => a + b, 0);
                void report();
              },
            });
            fractions[slot] = 0;
            if (analysis) {
              const { id, url, endTime, timeClass: tc, color, result, ending } = game;
              await deps.repo.save(username, { meta: { id, url, endTime, timeClass: tc, color, result, ending }, analysis }, deps.config.ENGINE_DEPTH);
            }
            state.done += 1;
            state.inFlight = fractions.reduce((a, b) => a + b, 0);
            await report(true, analysis ? game.id : undefined);
          }
        };

        try {
          await Promise.all(engines.map((engine, slot) => run(engine, slot)));
        } catch (e) {
          controller.abort(); // stop the other engines too
          if (e instanceof DOMException && e.name === 'AbortError') throw new UnrecoverableError(CANCELLED);
          throw e;
        }
        if (controller.signal.aborted) throw new UnrecoverableError(CANCELLED);
      }

      state.phase = 'done';
      state.inFlight = 0;
      await report(true);
    } finally {
      clearInterval(cancelPoll);
      for (const engine of engines) engine.dispose();
      await deps.redis.del(activeKey(job.data), cancelKey(jobId)).catch(() => undefined);
    }
  };
}
