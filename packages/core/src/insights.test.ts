import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { isTimeTrouble, parseClocks, parseTimeControl, timeSpent } from './clock';
import { conversion } from './conversion';
import { makeError, makeGame } from './fixtures';
import { biggestFreeCapture, detectMotif } from './motifs';
import { openingExplorer } from './openingExplorer';
import { motifBreakdown, pieceBreakdown, repeatedMistakes } from './patterns';
import { timeStats } from './timeStats';
import { MATE_CP } from './winProb';

describe('clock parsing', () => {
  it('reads Chess.com clock comments in order', () => {
    const pgn = '1. e4 {[%clk 0:02:59.9]} 1... e5 {[%clk 0:02:58.1]} 2. Nf3 {[%clk 0:02:55]}';
    expect(parseClocks(pgn)).toEqual([179.9, 178.1, 175]);
  });
  it('gives nothing for a PGN without clocks', () => {
    expect(parseClocks('1. e4 e5')).toEqual([]);
  });
  it('reads time controls', () => {
    expect(parseTimeControl('180+2')).toEqual({ base: 180, inc: 2 });
    expect(parseTimeControl('600')).toEqual({ base: 600, inc: 0 });
    expect(parseTimeControl('1/86400')).toBeNull();
    expect(parseTimeControl(undefined)).toBeNull();
  });
  it('works out time spent including the increment', () => {
    expect(timeSpent(180, 178, 2)).toBe(4);
    expect(timeSpent(null, 178, 0)).toBeNull();
    expect(timeSpent(10, 12, 0)).toBe(0);
  });
  it('flags low clocks relative to the time control', () => {
    expect(isTimeTrouble(20, { base: 180, inc: 0 })).toBe(false);
    expect(isTimeTrouble(14, { base: 180, inc: 0 })).toBe(true);
    expect(isTimeTrouble(50, { base: 600, inc: 0 })).toBe(true);
    expect(isTimeTrouble(null, { base: 600, inc: 0 })).toBe(false);
  });
});

describe('motif detection', () => {
  // White queen takes a pawn on d5 and can be captured for free by the knight on f6.
  const HANG_BEFORE = 'rnbqkb1r/ppp2ppp/5n2/3pp3/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 0 4';
  it('sees a hanging piece after the move', () => {
    const c = new Chess(HANG_BEFORE);
    c.move('Qh5'); // attacked by the f6 knight, defended by nothing
    expect(biggestFreeCapture(c.fen())).toBeGreaterThanOrEqual(9);
  });
  it('names the mistake by what went wrong, in order of severity', () => {
    const base = { fenBefore: HANG_BEFORE, fenAfter: HANG_BEFORE, played: { piece: 'q' }, bestUci: 'g1f3', cpBefore: 50, cpAfter: -300 };
    expect(detectMotif({ ...base, cpAfter: -MATE_CP })).toBe('allowed-mate');
    expect(detectMotif({ ...base, cpBefore: MATE_CP })).toBe('missed-mate');
  });
  it('calls a quiet error positional', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const c = new Chess(start);
    c.move('a3');
    expect(detectMotif({ fenBefore: start, fenAfter: c.fen(), played: { piece: 'p' }, bestUci: 'e2e4', cpBefore: 30, cpAfter: -200 })).toBe('positional');
  });
  it('spots a missed free capture', () => {
    // The black knight on e5 is attacked and undefended: Nxe5 wins a piece. The player made a safe quiet move instead
    // (Ke2 keeps the d3 knight defended), so nothing is left hanging and the mistake is the missed capture.
    const before = '4k3/8/8/4n3/8/3N4/8/4K3 w - - 0 1';
    const c = new Chess(before);
    c.move('Ke2');
    expect(detectMotif({ fenBefore: before, fenAfter: c.fen(), played: { piece: 'k' }, bestUci: 'd3e5', cpBefore: 300, cpAfter: 0 })).toBe('missed-capture');
  });
});

describe('timeStats', () => {
  it('ignores games without clock data', () => {
    expect(timeStats([makeGame('a')]).games).toBe(0);
  });
  it('compares errors with plenty of time and in time trouble', () => {
    const sans = Array.from({ length: 200 }, () => 'a3');
    // White moves at even plies: 50 moves with plenty of time, then 50 in time trouble, with a blunder on every second one.
    const clocks = sans.map((_, i) => (i < 100 ? 170 : 10));
    const kinds = sans.map((_, i) => (i >= 100 && i % 4 === 0 ? 'blunder' : 'ok')) as ('ok' | 'blunder')[];
    const stats = timeStats([makeGame('a', { sans, clocks, kinds, base: 180 })]);
    expect(stats.games).toBe(1);
    expect(stats.troublePct).toBe(50);
    expect(stats.seriousPer100).toEqual({ normal: 0, trouble: 50 });
  });
  it('counts games lost on time', () => {
    const clocks = [100, 100];
    const stats = timeStats([
      makeGame('a', { sans: ['e4', 'e5'], clocks, result: 'loss', ending: 'timeout' }),
      makeGame('b', { sans: ['e4', 'e5'], clocks, result: 'loss', ending: 'resignation' }),
    ]);
    expect(stats.lostOnTime).toEqual({ games: 1, losses: 2 });
  });
});

describe('conversion', () => {
  it('separates converted from thrown wins, and saved from lost bad positions', () => {
    const c = conversion([
      makeGame('won', { peakWin: 95, result: 'win' }),
      makeGame('thrown', { peakWin: 90, result: 'loss', turningPly: 30 }),
      makeGame('drawn', { peakWin: 85, result: 'draw' }),
      makeGame('saved', { lowWin: 10, result: 'win' }),
      makeGame('lost', { lowWin: 5, result: 'loss' }),
      makeGame('plain'),
    ]);
    expect(c.winning).toEqual({ games: 3, converted: 1, thrown: 2 });
    expect(c.losing).toEqual({ games: 2, saved: 1, lost: 1 });
    expect(c.turningPoints).toBe(1);
    expect(c.thrownGames.map((g) => g.meta.id).sort()).toEqual(['drawn', 'thrown']);
  });
});

describe('patterns', () => {
  const games = [
    makeGame('a', { errors: [makeError('a', 10, 40, { motif: 'hung-piece', piece: 'q', fenBefore: 'X 1 w KQkq - 0 5', san: 'Qh5' })] }),
    makeGame('b', { errors: [makeError('b', 12, 35, { motif: 'hung-piece', piece: 'q', fenBefore: 'X 1 w KQkq - 3 9', san: 'Qh5' }), makeError('b', 20, 15, { kind: 'inaccuracy' })] }),
    makeGame('c', { errors: [makeError('c', 8, 25, { motif: 'positional', piece: 'n' })] }),
  ];
  it('tallies motifs and pieces among serious errors only', () => {
    const motifs = motifBreakdown(games);
    expect(motifs[0]).toMatchObject({ key: 'hung-piece', count: 2 });
    expect(motifs.reduce((n, m) => n + m.count, 0)).toBe(3);
    expect(pieceBreakdown(games)[0]).toMatchObject({ key: 'q', count: 2 });
  });
  it('finds the same mistake in the same position across games, ignoring move counters', () => {
    const rep = repeatedMistakes(games);
    expect(rep).toHaveLength(1);
    expect(rep[0]).toMatchObject({ san: 'Qh5', count: 2 });
  });
  it('does not count two mistakes from one game as a pattern', () => {
    const one = makeGame('a', { errors: [makeError('a', 10, 40, { fenBefore: 'X', san: 'a3' }), makeError('a', 14, 40, { fenBefore: 'X', san: 'a3' })] });
    expect(repeatedMistakes([one])).toHaveLength(0);
  });
});

describe('openingExplorer', () => {
  const games = [
    makeGame('1', { sans: ['e4', 'e5', 'Nf3'], result: 'win', evals: [0, 30, 20, 40] }),
    makeGame('2', { sans: ['e4', 'c5', 'Nf3'], result: 'loss', evals: [0, 30, -10, 0], kinds: ['ok', 'ok', 'mistake'] }),
    makeGame('3', { sans: ['d4', 'd5'], result: 'draw', evals: [0, 20, 10] }),
    makeGame('4', { sans: ['e4', 'e6'], color: 'black', result: 'win', evals: [0, 30, 10] }),
  ];
  it('lists your first moves with score and counts, most played first', () => {
    const root = openingExplorer(games, 'white');
    expect(root.games).toBe(3);
    expect(root.moves.map((m) => m.san)).toEqual(['e4', 'd4']);
    expect(root.moves[0]).toMatchObject({ san: 'e4', games: 2, scorePct: 50, byYou: true });
  });
  it('follows a path and shows what opponents answered', () => {
    const node = openingExplorer(games, 'white', ['e4']);
    expect(node.games).toBe(2);
    expect(node.moves.map((m) => m.san).sort()).toEqual(['c5', 'e5']);
    expect(node.moves.every((m) => !m.byYou)).toBe(true);
  });
  it('keeps colours apart and counts serious errors on a move', () => {
    expect(openingExplorer(games, 'black').games).toBe(1);
    const afterC5 = openingExplorer(games, 'white', ['e4', 'c5']);
    expect(afterC5.moves[0]).toMatchObject({ san: 'Nf3', seriousErrors: 1 });
  });
});
