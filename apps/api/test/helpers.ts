import { Worker } from 'bullmq';
import type { FastifyInstance } from 'fastify';
import { createDeps } from '../src/bootstrap.js';
import { loadConfig } from '../src/config.js';
import { StockfishProcess } from '../src/engine/stockfishProcess.js';
import { QUEUE_NAME, createRedis, type AnalysisJobData } from '../src/queue/queue.js';
import { createProcessor } from '../src/queue/processor.js';
import type { AnalysisGame, GamesSource } from '../src/services/chesscom.js';
import { buildServer } from '../src/server.js';

/** A short, legal game with clock comments. "tester" plays White. */
export const PGN = `[White "tester"]
[Black "opponent"]
[Result "1-0"]
[WhiteElo "1500"]
[BlackElo "1480"]
[TimeControl "180+2"]
[ECOUrl "https://www.chess.com/openings/Italian-Game-Giuoco-Piano-4.c3"]

1. e4 {[%clk 0:03:00]} 1... e5 {[%clk 0:03:00]} 2. Nf3 {[%clk 0:02:58]} 2... Nc6 {[%clk 0:02:58]} 3. Bc4 {[%clk 0:02:55]} 3... Bc5 {[%clk 0:02:57]} 4. c3 {[%clk 0:02:50]} 4... Nf6 {[%clk 0:02:55]} 5. d4 {[%clk 0:02:48]} 5... exd4 {[%clk 0:02:50]} 6. cxd4 {[%clk 0:02:40]} 6... Bb4+ {[%clk 0:02:48]} 1-0`;

export function fakeGame(id: string, endTime = 1_800_000_000): AnalysisGame {
  return { id, url: `https://www.chess.com/game/live/${id}`, pgn: PGN, endTime, timeClass: 'blitz', color: 'white', result: 'win', ending: 'resignation' };
}

/** A Chess.com stand-in a test can change between steps: set `games`, or `failWith` to make it error. */
export class FakeSource implements GamesSource {
  calls = 0;
  failWith: Error | null = null;
  constructor(public games: AnalysisGame[]) {}
  async recentGames({ limit }: { limit: number }) {
    this.calls += 1;
    if (this.failWith) throw this.failWith;
    return this.games.slice(0, limit);
  }
}

export function testConfig(overrides: Record<string, string> = {}) {
  const { DATABASE_URL, REDIS_URL } = process.env;
  if (!DATABASE_URL || !REDIS_URL) throw new Error('Set DATABASE_URL and REDIS_URL to a throwaway Postgres database and Redis database for the tests.');
  return loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', DATABASE_URL, REDIS_URL, ENGINE_DEPTH: '8', ENGINES_PER_JOB: '2', ...overrides });
}

/** Everything a test needs: the API, a worker using a fake Chess.com, and clean state. */
export async function startStack(source: GamesSource, overrides: Record<string, string> = {}) {
  const config = testConfig(overrides);
  const deps = createDeps(config);
  await deps.redis.flushdb();
  await deps.prisma.analyzedGame.deleteMany();
  await deps.queue.obliterate({ force: true }).catch(() => undefined);

  const workerConnection = createRedis(config.REDIS_URL);
  const processorRedis = createRedis(config.REDIS_URL);
  const worker = new Worker<AnalysisJobData>(
    QUEUE_NAME,
    createProcessor({ config, source, repo: deps.repo, redis: processorRedis, startEngine: () => StockfishProcess.start(config.STOCKFISH_PATH) }),
    { connection: workerConnection, concurrency: 1 }
  );
  await worker.waitUntilReady();
  await deps.queueEvents.waitUntilReady();
  const app: FastifyInstance = await buildServer(deps);

  return {
    app,
    deps,
    async stop() {
      await app.close();
      await worker.close();
      workerConnection.disconnect();
      processorRedis.disconnect();
      await deps.close();
    },
  };
}

export async function waitFor<T>(fn: () => Promise<T | undefined | false>, ms = 45_000, step = 150): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > end) throw new Error('Timed out waiting for a condition.');
    await new Promise((r) => setTimeout(r, step));
  }
}
