import { describe, expect, it } from 'vitest';
import { analyzeGame } from './analyzeGame';
import { MATE_CP, classifyLoss, moveAccuracy, toWhiteCp, winPercent } from './winProb';
import type { Engine, EngineEval } from './types';

/** Fool's mate: 1.f3 e5 2.g4 Qh4#. White (alice) blunders on move 2; black (bob) plays perfectly. */
const PGN = `[White "alice"]
[Black "bob"]
[Result "0-1"]
[ECOUrl "https://www.chess.com/openings/Bird-Opening-1...e5"]

1. f3 e5 2. g4 Qh4# 0-1`;

/** Scripted engine: returns the next prepared evaluation for each call, in order. */
function scripted(evals: EngineEval[]): Engine {
  let i = 0;
  return { evaluate: async () => evals[i++] };
}

// Positions 0-3 are evaluated; position 4 is checkmate, which needs no engine.
const SCRIPT: EngineEval[] = [
  { whiteCp: 20, bestUci: 'e2e4' },
  { whiteCp: -50, bestUci: 'e7e5' },
  { whiteCp: -60, bestUci: 'd2d4' },
  { whiteCp: -MATE_CP, bestUci: 'd8h4' },
];

describe('win chance', () => {
  it('is 50% at equality and symmetric', () => {
    expect(winPercent(0)).toBeCloseTo(50, 5);
    expect(winPercent(300) + winPercent(-300)).toBeCloseTo(100, 5);
  });
  it('saturates for mates', () => {
    expect(winPercent(MATE_CP)).toBeGreaterThan(97);
  });
});

describe('score normalisation', () => {
  it('flips the engine score when Black is to move', () => {
    expect(toWhiteCp({ cp: 120 }, 'w')).toBe(120);
    expect(toWhiteCp({ cp: 120 }, 'b')).toBe(-120);
  });
  it('treats mate for the side to move as a huge advantage for that side', () => {
    expect(toWhiteCp({ mate: 3 }, 'w')).toBe(MATE_CP);
    expect(toWhiteCp({ mate: 3 }, 'b')).toBe(-MATE_CP);
    expect(toWhiteCp({ mate: -2 }, 'w')).toBe(-MATE_CP);
  });
  it('treats "mate 0" as the side to move being checkmated', () => {
    expect(toWhiteCp({ mate: 0 }, 'w')).toBe(-MATE_CP);
  });
});

describe('classification', () => {
  it('uses Lichess-style bands', () => {
    expect(classifyLoss(5)).toBe('ok');
    expect(classifyLoss(10)).toBe('inaccuracy');
    expect(classifyLoss(20)).toBe('mistake');
    expect(classifyLoss(30)).toBe('blunder');
  });
  it('gives 100% accuracy for a perfect move and less for a blunder', () => {
    expect(moveAccuracy(0)).toBeCloseTo(100, 0);
    expect(moveAccuracy(40)).toBeLessThan(30);
  });
});

describe('analyzeGame', () => {
  it("finds White's blunder and leaves Black's perfect play alone", async () => {
    const white = await analyzeGame({ gameId: 'g1', pgn: PGN, username: 'Alice' }, scripted(SCRIPT), { depth: 8 });
    expect(white?.color).toBe('white');
    expect(white?.counts.blunder).toBe(1);
    expect(white?.errors).toHaveLength(1);
    expect(white?.errors[0]).toMatchObject({ ply: 2, moveNumber: 2, san: 'g4', bestSan: 'd4', kind: 'blunder', phase: 'opening', trainable: true });
    expect(white?.opening).toBe('Bird Opening');

    const black = await analyzeGame({ gameId: 'g1', pgn: PGN, username: 'bob' }, scripted(SCRIPT), { depth: 8 });
    expect(black?.color).toBe('black');
    expect(black?.counts).toEqual({ inaccuracy: 0, mistake: 0, blunder: 0 });
    expect(black?.accuracy).toBeGreaterThan(90);
  });

  it('returns null when the player was not in the game', async () => {
    expect(await analyzeGame({ gameId: 'g1', pgn: PGN, username: 'carol' }, scripted(SCRIPT), { depth: 8 })).toBeNull();
  });

  it('returns null for an unreadable PGN', async () => {
    expect(await analyzeGame({ gameId: 'x', pgn: 'not a pgn', username: 'alice' }, scripted(SCRIPT), { depth: 8 })).toBeNull();
  });

  it('stops when cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(analyzeGame({ gameId: 'g1', pgn: PGN, username: 'alice' }, scripted(SCRIPT), { depth: 8, signal: controller.signal })).rejects.toThrow();
  });

  it('does not call the engine for the final, finished position', async () => {
    let calls = 0;
    const engine: Engine = { evaluate: async () => SCRIPT[calls++] };
    await analyzeGame({ gameId: 'g1', pgn: PGN, username: 'alice' }, engine, { depth: 8 });
    expect(calls).toBe(4);
  });
});

import { parseBestMove, parseInfoLine } from './uci';

describe('UCI parsing', () => {
  it('reads depth and a centipawn score from a real engine line', () => {
    const line = 'info depth 10 seldepth 12 multipv 1 score cp -682 nodes 1578 nps 143454 hashfull 0 time 11 pv g8f6 b1c3';
    expect(parseInfoLine(line)).toEqual({ depth: 10, score: { cp: -682 } });
  });
  it('reads mate scores', () => {
    expect(parseInfoLine('info depth 5 score mate -2 nodes 10')).toEqual({ depth: 5, score: { mate: -2 } });
  });
  it('ignores bound scores and unrelated lines', () => {
    expect(parseInfoLine('info depth 5 score cp 30 lowerbound nodes 10')).toBeNull();
    expect(parseInfoLine('info string NNUE evaluation using nn.bin')).toBeNull();
    expect(parseInfoLine('readyok')).toBeNull();
  });
  it('reads the best move', () => {
    expect(parseBestMove('bestmove g8f6 ponder b1c3')).toBe('g8f6');
    expect(parseBestMove('bestmove (none)')).toBeNull();
    expect(parseBestMove('info depth 1')).toBeUndefined();
  });
});

describe('analyzeGame details', () => {
  const CLOCK_PGN = `[White "alice"]
[Black "bob"]
[WhiteElo "1500"]
[BlackElo "1620"]
[TimeControl "180+2"]
[UTCDate "2026.11.04"]
[Termination "bob won by checkmate"]
[ECOUrl "https://www.chess.com/openings/Bird-Opening-1...e5"]

1. f3 {[%clk 0:02:59]} 1... e5 {[%clk 0:02:58]} 2. g4 {[%clk 0:02:50]} 2... Qh4# {[%clk 0:02:57]} 0-1`;

  it('records every move with its quality, best move, clock and time spent', async () => {
    const a = await analyzeGame({ gameId: 'c1', pgn: CLOCK_PGN, username: 'alice' }, scripted(SCRIPT), { depth: 8 });
    expect(a?.plies.map((p) => p.san)).toEqual(['f3', 'e5', 'g4', 'Qh4#']);
    expect(a?.plies[2]).toMatchObject({ kind: 'blunder', bestUci: 'd2d4', clock: 170, spent: 11 }); // previous clock 179 + 2 increment - 170
    expect(a?.plies[0].spent).toBe(3); // 180 + 2 - 179
  });

  it('reads players, ratings, time control and result text', async () => {
    const a = await analyzeGame({ gameId: 'c1', pgn: CLOCK_PGN, username: 'alice' }, scripted(SCRIPT), { depth: 8 });
    expect(a?.info).toMatchObject({ opponent: 'bob', opponentRating: 1620, playerRating: 1500, timeControl: { base: 180, inc: 2 }, termination: 'bob won by checkmate' });
  });

  it('names the blunder and finds the turning point and the lowest point', async () => {
    const a = await analyzeGame({ gameId: 'c1', pgn: CLOCK_PGN, username: 'alice' }, scripted(SCRIPT), { depth: 8 });
    expect(a?.errors[0].motif).toBe('allowed-mate');
    expect(a?.errors[0].piece).toBe('p');
    expect(a?.turningPly).toBe(2);
    expect(a?.lowWin).toBeLessThan(5);
    expect(a?.peakWin).toBeGreaterThan(40);
  });

  it('works without clock data', async () => {
    const a = await analyzeGame({ gameId: 'g1', pgn: PGN, username: 'alice' }, scripted(SCRIPT), { depth: 8 });
    expect(a?.plies.every((p) => p.clock === null && p.spent === null)).toBe(true);
  });
});
