import { MATE_CP, type MoveKind } from '@daily-gambit/core';

/** Engine evaluation as chess players write it: "+1.3", "-0.4", "M" for a forced mate. */
export function formatEval(whiteCp: number): string {
  if (Math.abs(whiteCp) >= MATE_CP) return whiteCp > 0 ? '+M' : '-M';
  const pawns = whiteCp / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

/** ["e4","e5","Nf3"] -> "1. e4 e5 2. Nf3" */
export function formatPath(path: readonly string[]): string {
  return path.map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${san}` : san)).join(' ');
}

/** 65.4 -> "1:05". Clocks in games are whole seconds or tenths. */
export function formatClock(seconds: number | null): string {
  if (seconds === null) return '–';
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const KIND_LABEL: Record<MoveKind, string> = { ok: 'Good move', inaccuracy: 'Inaccuracy', mistake: 'Mistake', blunder: 'Blunder' };
export const KIND_MARK: Record<MoveKind, string> = { ok: '', inaccuracy: '?!', mistake: '?', blunder: '??' };

export const RESULT_LABEL = { win: 'Win', loss: 'Loss', draw: 'Draw', other: '–' } as const;

export const TIME_CLASSES = ['bullet', 'blitz', 'rapid', 'daily'] as const;
export type TimeClassFilter = (typeof TIME_CLASSES)[number] | 'all';
