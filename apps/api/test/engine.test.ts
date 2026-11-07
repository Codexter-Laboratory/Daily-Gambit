import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { StockfishProcess } from '../src/engine/stockfishProcess.js';

describe('StockfishProcess (real engine)', () => {
  let engine: StockfishProcess;
  beforeAll(async () => {
    engine = await StockfishProcess.start();
  });
  afterAll(() => engine.dispose());

  it('finds a sensible move and a near-equal score from the start position', async () => {
    const r = await engine.evaluate('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 8);
    expect(r.bestUci).toMatch(/^[a-h][1-8][a-h][1-8]/);
    expect(Math.abs(r.whiteCp)).toBeLessThan(120);
  });

  it('reports scores from White’s point of view even when Black is to move', async () => {
    // Black to move and a whole queen down: the engine says about -680 for Black, so +680 for White.
    const r = await engine.evaluate('rnb1kbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 8);
    expect(r.whiteCp).toBeGreaterThan(400);
  });

  it('answers several requests in order without mixing them up', async () => {
    const results = await Promise.all([
      engine.evaluate('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 6),
      engine.evaluate('rnb1kbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 6),
      engine.evaluate('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 6),
    ]);
    expect(Math.abs(results[0].whiteCp)).toBeLessThan(120);
    expect(results[1].whiteCp).toBeGreaterThan(400);
    expect(Math.abs(results[2].whiteCp)).toBeLessThan(120);
  });

  it('refuses work after it has been shut down', async () => {
    const other = await StockfishProcess.start();
    other.dispose();
    await expect(other.evaluate('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 4)).rejects.toThrow();
  });
});
