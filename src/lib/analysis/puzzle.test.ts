import { describe, expect, it } from 'vitest';
import { isAcceptableAlternative, isBestMove, playMove, playSan, trainingStreak } from './puzzle';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('playMove', () => {
  it('plays a legal move and reports it in UCI and SAN', () => {
    expect(playMove(START, 'e2', 'e4')).toMatchObject({ uci: 'e2e4', san: 'e4' });
  });
  it('rejects an illegal move', () => {
    expect(playMove(START, 'e2', 'e5')).toBeNull();
    expect(playMove(START, 'e7', 'e5')).toBeNull();
  });
  it('promotes to a queen', () => {
    expect(playMove('8/P6k/8/8/8/8/7K/8 w - - 0 1', 'a7', 'a8')).toMatchObject({ uci: 'a7a8q' });
  });
});

describe('playSan', () => {
  it('reads standard notation and tolerates stray check marks and zeros in castling', () => {
    expect(playSan(START, 'e4')).toMatchObject({ uci: 'e2e4', san: 'e4' });
    expect(playSan(START, 'Nf3')).toMatchObject({ uci: 'g1f3' });
    expect(playSan('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', '0-0')).toMatchObject({ uci: 'e1g1' });
  });
  it('rejects illegal and unreadable input', () => {
    expect(playSan(START, 'e5')).toBeNull();
    expect(playSan(START, 'hello')).toBeNull();
    expect(playSan(START, '')).toBeNull();
  });
});

describe('isBestMove', () => {
  it('compares UCI strings ignoring case', () => {
    expect(isBestMove({ bestUci: 'e2e4' }, 'E2E4')).toBe(true);
    expect(isBestMove({ bestUci: 'e2e4' }, 'd2d4')).toBe(false);
  });
});

describe('isAcceptableAlternative', () => {
  it('accepts a move that keeps the win chance and rejects one that throws it away', () => {
    const white = { color: 'white' as const, winBefore: 70 };
    expect(isAcceptableAlternative(white, 300)).toBe(true); // about 75%
    expect(isAcceptableAlternative(white, -200)).toBe(false);
  });
  it('reads the evaluation from Black’s side for Black', () => {
    const black = { color: 'black' as const, winBefore: 70 };
    expect(isAcceptableAlternative(black, -300)).toBe(true);
    expect(isAcceptableAlternative(black, 300)).toBe(false);
  });
});

describe('trainingStreak', () => {
  it('counts consecutive days ending today', () => {
    expect(trainingStreak(['2026-11-02', '2026-11-03', '2026-11-04'], '2026-11-04')).toBe(3);
  });
  it('keeps the streak alive until the end of today', () => {
    expect(trainingStreak(['2026-11-02', '2026-11-03'], '2026-11-04')).toBe(2);
  });
  it('breaks after a missed day', () => {
    expect(trainingStreak(['2026-11-01', '2026-11-03'], '2026-11-04')).toBe(1);
    expect(trainingStreak(['2026-10-30'], '2026-11-04')).toBe(0);
  });
});
