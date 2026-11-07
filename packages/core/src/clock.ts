import type { TimeControl } from './types';

/** "180+2" -> 3 minutes plus 2 seconds. Daily games ("1/86400") and unknown formats give null. */
export function parseTimeControl(header: string | null | undefined): TimeControl | null {
  const m = /^(\d+)(?:\+(\d+))?$/.exec(header?.trim() ?? '');
  return m ? { base: Number(m[1]), inc: Number(m[2] ?? 0) } : null;
}

/**
 * Seconds left after every half-move, in order, read from Chess.com's {[%clk 0:02:59.9]} comments.
 * Games without clock comments give an empty array.
 */
export function parseClocks(pgn: string): number[] {
  const out: number[] = [];
  for (const m of pgn.matchAll(/\[%clk (\d+):(\d{2}):(\d{2}(?:\.\d+)?)\]/g)) {
    out.push(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
  }
  return out;
}

/** Seconds a move took: the clock before, plus the increment, minus the clock after. Never negative. */
export function timeSpent(prevClock: number | null, clock: number | null, inc: number): number | null {
  if (prevClock === null || clock === null) return null;
  return Math.max(0, Math.round((prevClock + inc - clock) * 10) / 10);
}

/** Low on time: under 10% of the starting time, but at least 15 seconds' worth of panic. */
export function isTimeTrouble(clock: number | null, control: TimeControl | null): boolean {
  if (clock === null || !control) return false;
  return clock <= Math.max(15, control.base * 0.1);
}
