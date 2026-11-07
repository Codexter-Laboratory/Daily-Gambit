import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { parseBestMove, parseInfoLine, toWhiteCp, type Engine, type EngineEval, type UciInfo } from '@daily-gambit/core';

const START_TIMEOUT_MS = 20_000;
const EVAL_TIMEOUT_MS = 60_000;

/** The command that starts Stockfish: a native binary if configured, else the WebAssembly build under Node. */
export function engineCommand(stockfishPath?: string): { command: string; args: string[] } {
  if (stockfishPath) return { command: stockfishPath, args: [] };
  const dir = join(dirname(createRequire(import.meta.url).resolve('stockfish/package.json')), 'src');
  const js = readdirSync(dir).find((f) => /^stockfish-.*lite-single-[0-9a-f]+\.js$/.test(f));
  if (!js) throw new Error('Could not find the Stockfish lite single-thread build in the stockfish package.');
  return { command: process.execPath, args: [join(dir, js)] };
}

/** Stockfish as a child process, spoken to over UCI. One position at a time: calls queue up. */
export class StockfishProcess implements Engine {
  private queue: Promise<unknown> = Promise.resolve();
  private listener: ((line: string) => void) | null = null;
  private failure: ((error: Error) => void) | null = null;
  private disposed = false;

  private constructor(private readonly child: ChildProcessWithoutNullStreams) {
    createInterface({ input: child.stdout }).on('line', (line) => this.listener?.(line.trim()));
    child.on('error', (e) => this.failure?.(e));
    child.on('exit', (code) => {
      if (!this.disposed) this.failure?.(new Error(`Stockfish exited unexpectedly (code ${code}).`));
    });
    // Without an error listener a write to a dead process would crash the whole API.
    child.stdin.on('error', () => undefined);
  }

  static async start(stockfishPath?: string): Promise<StockfishProcess> {
    const { command, args } = engineCommand(stockfishPath);
    const engine = new StockfishProcess(spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] }));
    try {
      await engine.command('uci', START_TIMEOUT_MS, (line, done) => line === 'uciok' && done());
      engine.send('setoption name Threads value 1');
      engine.send('setoption name Hash value 32');
      await engine.command('isready', START_TIMEOUT_MS, (line, done) => line === 'readyok' && done());
    } catch (e) {
      engine.dispose();
      throw e;
    }
    return engine;
  }

  private send(line: string) {
    this.child.stdin.write(`${line}\n`);
  }

  /** Sends a command and feeds engine output lines to `onLine` until it calls `done`. */
  private command<T>(cmd: string, timeoutMs: number, onLine: (line: string, done: (value?: T) => void) => void): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const finish = () => {
        clearTimeout(timer);
        this.listener = null;
        this.failure = null;
      };
      const timer = setTimeout(() => {
        finish();
        this.send('stop');
        reject(new Error(`Stockfish did not answer within ${timeoutMs / 1000}s.`));
      }, timeoutMs);
      this.listener = (line) =>
        onLine(line, (value) => {
          finish();
          resolve(value as T);
        });
      this.failure = (e) => {
        finish();
        reject(e);
      };
      this.send(cmd);
    });
  }

  evaluate(fen: string, depth: number): Promise<EngineEval> {
    if (this.disposed) return Promise.reject(new Error('Engine was shut down.'));
    const run = async (): Promise<EngineEval> => {
      this.send(`position fen ${fen}`);
      const sideToMove = fen.split(' ')[1] === 'b' ? 'b' : 'w';
      let best: UciInfo | null = null;
      const bestUci = await this.command<string | null>(`go depth ${depth}`, EVAL_TIMEOUT_MS, (line, done) => {
        const info = parseInfoLine(line);
        if (info && (!best || info.depth >= best.depth)) best = info;
        const move = parseBestMove(line);
        if (move !== undefined) done(move);
      });
      const found = best as UciInfo | null;
      return { whiteCp: found ? toWhiteCp(found.score, sideToMove) : 0, bestUci };
    };
    const next = this.queue.then(run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  dispose() {
    this.disposed = true;
    this.child.kill();
  }
}
