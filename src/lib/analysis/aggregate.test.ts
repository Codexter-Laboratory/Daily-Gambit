import { describe, expect, it } from 'vitest';
import { accuracyTrend, buildDeck, openingReport, phaseBreakdown, puzzleId, summarize, topInsights } from './aggregate';
import { makeError, makeGame } from './fixtures';

const err = (gameId: string, ply: number, winLoss: number, trainable = true) => makeError(gameId, ply, winLoss, { trainable });
const game = makeGame;

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

describe('topInsights, motifs', () => {
  it('leads with the most common kind of mistake when it dominates', () => {
    const games = ['1', '2', '3'].map((id) => game(id, { errors: [makeError(id, 2, 40, { motif: 'hung-piece' })] }));
    expect(topInsights(games)[0]).toContain('left a piece hanging');
  });
  it('mentions thrown wins', () => {
    const games = ['1', '2', '3'].map((id) => game(id, { peakWin: 90, result: 'loss' }));
    expect(topInsights(games).join(' ')).toContain('failed to win 3');
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
  it('puts puzzles you failed before first, even beyond the per-game limit', () => {
    const deck = buildDeck(games, new Set(), '2026-11-04', 3, new Set(['a:6']));
    expect(puzzleId(deck[0])).toBe('a:6');
    expect(deck).toHaveLength(3);
  });
});
