import { describe, expect, it } from 'vitest';
import { accuracyTrend, buildDeck, openingReport, phaseBreakdown, puzzleId, summarize, topInsights } from './aggregate';
import type { AnalyzedGame, MoveError, Phase, Side } from './types';

function err(gameId: string, ply: number, winLoss: number, trainable = true): MoveError {
  return {
    gameId, ply, moveNumber: ply / 2 + 1, color: 'white', fenBefore: 'f', san: 'a', bestUci: 'e2e4', bestSan: 'e4',
    winBefore: 60, winAfter: 60 - winLoss, winLoss, kind: winLoss >= 30 ? 'blunder' : 'mistake', phase: 'middlegame', opening: 'Sicilian Defense', trainable,
  };
}

function game(id: string, opts: { opening?: string; color?: Side; result?: 'win' | 'loss' | 'draw'; accuracy?: number; errors?: MoveError[]; phase?: Phase; endTime?: number } = {}): AnalyzedGame {
  const errors = opts.errors ?? [];
  const blunders = errors.filter((e) => e.kind === 'blunder').length;
  const mistakes = errors.filter((e) => e.kind === 'mistake').length;
  const phase = opts.phase ?? 'middlegame';
  const byPhase = { opening: { moves: 10, inaccuracy: 0, mistake: 0, blunder: 0 }, middlegame: { moves: 20, inaccuracy: 0, mistake: 0, blunder: 0 }, endgame: { moves: 5, inaccuracy: 0, mistake: 0, blunder: 0 } };
  byPhase[phase].mistake += mistakes;
  byPhase[phase].blunder += blunders;
  return {
    meta: { id, url: `https://chess.com/game/${id}`, endTime: opts.endTime ?? 1_700_000_000, timeClass: 'blitz', color: opts.color ?? 'white', result: opts.result ?? 'win' },
    analysis: {
      gameId: id, color: opts.color ?? 'white', opening: opts.opening ?? 'Sicilian Defense', engine: 't', depth: 1, analyzedAt: 0, accuracy: opts.accuracy ?? 80,
      playerMoves: 35, counts: { inaccuracy: 0, mistake: mistakes, blunder: blunders }, byPhase, evals: [], errors,
    },
  };
}

describe('summarize', () => {
  it('averages accuracy and counts results and errors', () => {
    const s = summarize([game('a', { accuracy: 90, result: 'win' }), game('b', { accuracy: 70, result: 'loss', errors: [err('b', 4, 40)] })]);
    expect(s).toMatchObject({ games: 2, avgAccuracy: 80, win: 1, loss: 1, totals: { blunder: 1 } });
    expect(s.perGame.blunder).toBe(0.5);
  });
  it('handles no games', () => {
    expect(summarize([]).games).toBe(0);
  });
});

describe('phaseBreakdown', () => {
  it('reports mistakes and blunders per 100 moves in each phase', () => {
    const rows = phaseBreakdown([game('a', { phase: 'endgame', errors: [err('a', 2, 40)] })]);
    expect(rows.find((r) => r.phase === 'endgame')).toMatchObject({ moves: 5, blunder: 1, errorsPer100: 20 });
    expect(rows.find((r) => r.phase === 'opening')?.errorsPer100).toBe(0);
  });
});

describe('openingReport', () => {
  it('ranks the costliest leak first and drops tiny samples', () => {
    const rows = openingReport([
      game('1', { opening: 'Italian Game', result: 'loss' }),
      game('2', { opening: 'Italian Game', result: 'loss' }),
      game('3', { opening: 'French Defense', result: 'win' }),
      game('4', { opening: 'French Defense', result: 'win' }),
      game('5', { opening: 'Rare Gambit', result: 'loss' }),
    ]);
    expect(rows.map((r) => r.opening)).toEqual(['Italian Game', 'French Defense']);
    expect(rows[0]).toMatchObject({ games: 2, scorePct: 0, cost: 100 });
  });
  it('keeps colours apart', () => {
    const rows = openingReport([game('1', { color: 'white' }), game('2', { color: 'white' }), game('3', { color: 'black' })]);
    expect(rows).toHaveLength(1);
  });
});

describe('accuracyTrend', () => {
  it('is ordered oldest first', () => {
    const t = accuracyTrend([game('new', { endTime: 2000 }), game('old', { endTime: 1000 })]);
    expect(t.map((p) => p.id)).toEqual(['old', 'new']);
  });
});

describe('topInsights', () => {
  it('stays quiet with too little data', () => {
    expect(topInsights([game('a')])).toEqual([]);
  });
  it('names the worst phase and the costliest opening', () => {
    const games = ['1', '2', '3'].map((id) => game(id, { opening: 'Italian Game', result: 'loss', phase: 'middlegame', errors: [err(id, 2, 40)] }));
    const text = topInsights(games).join(' ');
    expect(text).toContain('middlegame');
    expect(text).toContain('Italian Game');
  });
});

describe('buildDeck', () => {
  const games = [
    game('a', { errors: [err('a', 2, 50), err('a', 4, 45), err('a', 6, 40)] }),
    game('b', { errors: [err('b', 2, 35), err('b', 4, 80, false)] }),
  ];
  it('takes only trainable puzzles, at most two per game', () => {
    const deck = buildDeck(games, new Set(), '2026-11-04', 10);
    expect(deck.map(puzzleId).sort()).toEqual(['a:2', 'a:4', 'b:2']);
  });
  it('is stable for a day and skips solved puzzles', () => {
    const one = buildDeck(games, new Set(), '2026-11-04', 3).map(puzzleId);
    expect(buildDeck(games, new Set(), '2026-11-04', 3).map(puzzleId)).toEqual(one);
    expect(buildDeck(games, new Set(['a:2']), '2026-11-04', 3).map(puzzleId)).not.toContain('a:2');
  });
});
