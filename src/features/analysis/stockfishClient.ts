import { parseBestMove, parseInfoLine, type UciInfo } from '../../lib/analysis/uci';
import { toWhiteCp } from '../../lib/analysis/winProb';
import type { Engine, EngineEval } from '../../lib/analysis/types';

const ENGINE_URL = '/engine/stockfish-lite.js';
const START_TIMEOUT_MS = 20_000;
const EVAL_TIMEOUT_MS = 30_000;

export interface StockfishClient extends Engine {
  /** Resolves when the engine is ready for its first position. */
  ready: Promise<void>;
  dispose(): void;
}

/**
 * Stockfish in a Web Worker, spoken to over UCI. One position at a time: calls are queued.
 * Scores are returned from White's point of view (see toWhiteCp).
 */
export function createStockfish(): StockfishClient {
  const worker = new Worker(ENGINE_URL);
  let listener: ((line: string) => void) | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  let disposed = false;

  worker.onmessage = (e: MessageEvent) => listener?.(String(e.data));

  const send = (cmd: string) => worker.postMessage(cmd);

  /** Sends a command and collects lines until `done` returns true. Rejects on timeout or worker error. */
  const run = <T>(cmd: string, timeoutMs: number, onLine: (line: string, finish: (v: T) => void) => void) =>
    new Promise<T>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        listener = null;
        worker.onerror = null;
      };
      const timer = setTimeout(() => {
        cleanup();
        send('stop');
        reject(new Error(`Stockfish did not answer within ${timeoutMs / 1000}s.`));
      }, timeoutMs);
      listener = (line) => onLine(line, (v) => (cleanup(), resolve(v)));
      worker.onerror = () => (cleanup(), reject(new Error('Stockfish crashed.')));
      send(cmd);
    });

  const ready = (async () => {
    await run<void>('uci', START_TIMEOUT_MS, (line, finish) => line === 'uciok' && finish());
    send('setoption name Threads value 1');
    send('setoption name Hash value 32');
    await run<void>('isready', START_TIMEOUT_MS, (line, finish) => line === 'readyok' && finish());
  })();

  const evaluateNow = async (fen: string, depth: number): Promise<EngineEval> => {
    await ready;
    send(`position fen ${fen}`);
    const sideToMove = fen.split(' ')[1] === 'b' ? 'b' : 'w';
    let best: UciInfo | null = null;
    const bestUci = await run<string | null>(`go depth ${depth}`, EVAL_TIMEOUT_MS, (line, finish) => {
      const info = parseInfoLine(line);
      if (info && (!best || info.depth >= best.depth)) best = info;
      const move = parseBestMove(line);
      if (move !== undefined) finish(move);
    });
    // "bestmove (none)" with no score means the position has no legal moves; callers handle
    // finished games themselves, so treat it as equal rather than guessing.
    const whiteCp = best ? toWhiteCp((best as UciInfo).score, sideToMove) : 0;
    return { whiteCp, bestUci };
  };

  return {
    ready,
    evaluate(fen, depth) {
      if (disposed) return Promise.reject(new Error('Engine was shut down.'));
      const next = queue.then(() => evaluateNow(fen, depth));
      queue = next.catch(() => undefined);
      return next;
    },
    dispose() {
      disposed = true;
      send('stop');
      worker.terminate();
    },
  };
}

let shared: StockfishClient | null = null;

/** One long-lived engine for short jobs (checking a puzzle answer). Created on first use. */
export function getSharedStockfish(): StockfishClient {
  if (!shared) shared = createStockfish();
  return shared;
}
