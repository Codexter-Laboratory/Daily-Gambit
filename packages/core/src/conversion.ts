import type { AnalyzedGame } from './types';

/** Win chance at or above which a position counts as clearly winning (about +4 pawns), and the mirror image. */
export const WINNING_AT = 80;
export const LOSING_AT = 20;

export type Conversion = {
  winning: { games: number; converted: number; thrown: number };
  losing: { games: number; saved: number; lost: number };
  /** Games where one move swung the result against you by 20 win-chance points or more. */
  turningPoints: number;
  /** Games that had a clearly winning position but did not win, newest first. */
  thrownGames: AnalyzedGame[];
};

export function conversion(games: AnalyzedGame[]): Conversion {
  const winning = games.filter((g) => g.analysis.peakWin >= WINNING_AT);
  const losing = games.filter((g) => g.analysis.lowWin <= LOSING_AT);
  const thrown = winning.filter((g) => g.meta.result !== 'win');
  return {
    winning: { games: winning.length, converted: winning.length - thrown.length, thrown: thrown.length },
    losing: {
      games: losing.length,
      saved: losing.filter((g) => g.meta.result === 'win' || g.meta.result === 'draw').length,
      lost: losing.filter((g) => g.meta.result === 'loss').length,
    },
    turningPoints: games.filter((g) => g.analysis.turningPly !== null).length,
    thrownGames: [...thrown].sort((a, b) => b.meta.endTime - a.meta.endTime),
  };
}
