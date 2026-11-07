// The two components that use Recharts, re-exported from one module on purpose. index.tsx loads
// each with next/dynamic. Because both point at this module, Recharts ends up in a single lazy chunk
// (two dynamic imports of two separate modules each got their own copy).
export { GamesRatingChart } from './GamesRatingChart';
export { PuzzleRushChart } from './PuzzleRushChart';
