import type { GameRecord } from '../../lib/gameRecords';

export type DateISO = string;

export type PuzzleRushPoint = {
  date: DateISO;
  attemptsTotal: number | null;
  scoreTotal: number | null;
  bestScore: number | null;
  attemptsDelta: number | null;
  scoreDelta: number | null;
};

export type GamesTimeClass =
  | 'bullet'
  | 'blitz'
  | 'rapid'
  | 'daily'
  | 'chess960'
  | 'bughouse'
  | 'crazyhouse'
  | 'kingofthehill'
  | 'threecheck'
  | 'atomic';

export type DashboardResponse = {
  username: string;
  puzzleRush: {
    points: PuzzleRushPoint[];
    streak: { current: number; best: number; endingDate: DateISO | null };
  };
};

export type GamesData = {
  /** Every game in the selected category and period, oldest first. All game charts use these. */
  points: GameRecord[];
  summary: { games: number; win: number; loss: number; draw: number };
  /** Months whose archive could not be loaded; 0 means complete. */
  missingMonths?: number;
};
