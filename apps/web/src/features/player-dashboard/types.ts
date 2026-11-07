import type { GameCategory, GamesSeries } from '@daily-gambit/contracts';

/** The categories the games filter offers: standard time controls and Chess.com's variants. */
export type GamesTimeClass = GameCategory;

/** The games series as the dashboard uses it (see GamesSeries in the contracts package). */
export type GamesData = Pick<GamesSeries, 'points' | 'summary' | 'missingMonths'>;
