import { Worker } from 'bullmq';
import type { FastifyInstance } from 'fastify';
import { createDeps } from '../src/bootstrap.js';
import { loadConfig } from '../src/config.js';
import { StockfishProcess } from '../src/engine/stockfishProcess.js';
import { QUEUE_NAME, createRedis, type AnalysisJobData } from '../src/queue/queue.js';
import { createProcessor } from '../src/queue/processor.js';
import type { ChessComStats, CurrentGamesResponse, GamesSeries, PlayerClubsResponse, PlayerMatchesResponse, PlayerProfile, PlayerTournamentsResponse } from '@daily-gambit/contracts';
import { ChessComError, type AnalysisGame, type PlayerData } from '../src/services/chesscom.js';
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

/** Lets a test slow the engine down, so a job lasts long enough to be cancelled deterministically. */
export const slowdown = { ms: 0 };

export function fakeGame(id: string, endTime = 1_800_000_000): AnalysisGame {
  return { id, url: `https://www.chess.com/game/live/${id}`, pgn: PGN, endTime, timeClass: 'blitz', color: 'white', result: 'win', ending: 'resignation' };
}

/** A Chess.com stand-in a test can change between steps. */
export class FakePlayers implements PlayerData {
  calls = 0;
  /** Make `recentGames` fail (the player vanishes after the job was queued). */
  failWith: Error | null = null;
  /** Players Chess.com has never heard of. */
  missing = new Set<string>();
  /** Chess.com is down: every read answers 502. */
  down = false;
  /** Holds `recentGames` until released, so a test can keep a job busy. */
  gate: Promise<void> | null = null;
  lastFresh: boolean | undefined;

  constructor(public games: AnalysisGame[] = []) {}

  private check(username: string, fresh?: boolean) {
    this.lastFresh = fresh;
    if (this.down) throw new ChessComError(502, 'down');
    if (this.missing.has(username)) throw new ChessComError(404, 'missing');
  }

  async recentGames({ limit }: { limit: number }) {
    this.calls += 1;
    if (this.gate) await this.gate;
    if (this.failWith) throw this.failWith;
    return this.games.slice(0, limit);
  }
  async profile(username: string, o: { fresh?: boolean } = {}): Promise<PlayerProfile> {
    this.check(username, o.fresh);
    return { '@id': `x/${username}`, url: `https://www.chess.com/member/${username}`, username, player_id: 1, status: 'basic', country: 'x', joined: 1, last_online: 2, followers: 3, is_streamer: false };
  }
  async stats(username: string, o: { fresh?: boolean } = {}): Promise<ChessComStats> {
    this.check(username, o.fresh);
    return { chess_blitz: { last: { rating: 1500 } } };
  }
  async clubs(username: string, o: { fresh?: boolean } = {}): Promise<PlayerClubsResponse> {
    this.check(username, o.fresh);
    return { clubs: [] };
  }
  async tournaments(username: string, o: { fresh?: boolean } = {}): Promise<PlayerTournamentsResponse> {
    this.check(username, o.fresh);
    return { finished: [], in_progress: [], registered: [] };
  }
  async matches(username: string, o: { fresh?: boolean } = {}): Promise<PlayerMatchesResponse> {
    this.check(username, o.fresh);
    return { finished: [], in_progress: [], registered: [] };
  }
  async currentGames(username: string, o: { fresh?: boolean } = {}): Promise<CurrentGamesResponse> {
    this.check(username, o.fresh);
    return { games: [] };
  }
  async gamesSeries(p: { username: string; timeClass: GamesSeries['timeClass']; months: number; fresh?: boolean }): Promise<GamesSeries> {
    this.check(p.username, p.fresh);
    return { username: p.username, timeClass: p.timeClass, months: p.months, points: [], summary: { games: 0, win: 0, loss: 0, draw: 0 }, missingMonths: 0 };
  }
}

export function testConfig(overrides: Record<string, string> = {}) {
  const { DATABASE_URL, REDIS_URL } = process.env;
  if (!DATABASE_URL || !REDIS_URL) throw new Error('Set DATABASE_URL and REDIS_URL to a throwaway Postgres database and Redis database for the tests.');
  return loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', DATABASE_URL, REDIS_URL, ENGINE_DEPTH: '8', ENGINES_PER_JOB: '2', ...overrides });
}

/** Everything a test needs: the API, a worker using a fake Chess.com, and clean state. */
export async function startStack(source: FakePlayers, overrides: Record<string, string> = {}) {
  const config = testConfig(overrides);
  const deps = createDeps(config);
  deps.chessCom = source; // never talk to the real Chess.com in tests
  await deps.redis.flushdb();
  await deps.prisma.analyzedGame.deleteMany();
  await deps.queue.obliterate({ force: true }).catch(() => undefined);

  const workerConnection = createRedis(config.REDIS_URL);
  const processorRedis = createRedis(config.REDIS_URL);
  const worker = new Worker<AnalysisJobData>(
    QUEUE_NAME,
    createProcessor({ config, source, repo: deps.repo, redis: processorRedis, startEngine: async () => {
        const engine = await StockfishProcess.start(config.STOCKFISH_PATH);
        const evaluate = engine.evaluate.bind(engine);
        engine.evaluate = async (fen, depth) => {
          if (slowdown.ms) await new Promise((r) => setTimeout(r, slowdown.ms));
          return evaluate(fen, depth);
        };
        return engine;
      },
    }),
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
