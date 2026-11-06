# Migration from Fix My Chess

Fix My Chess was a React Native (Nx) app: enter a Chess.com username, get opening leaks and Stockfish blunder detection, then practise the blunders as puzzles. Its useful parts were a small amount of pure TypeScript. Daily Gambit already had the account dashboard, so the analysis was brought over and rebuilt for the web rather than merging the two apps.

The Fix My Chess repository was **not changed**. It can be archived once this is merged.

## Where each feature went

| Fix My Chess | Daily Gambit |
| --- | --- |
| Home screen: enter a username | Existing search box and `/player/<username>` |
| Profile check, "user not found" message | Existing username validation and not-found page |
| `fetchRecentGames` (last 3 months, retry on 429) | `fetchRecentAnalysisGames` (newest first, up to 100 games, time-control filter), behind `/api/analysis-games` with Chess.com caching |
| `calculateLeaks`, `getWorstOpenings` | `openingReport` (ranked by points lost, split by colour) and the opening explorer |
| `blunderAnalyzer`, `useBlunderDetector` | `analyzeGame`, one function used for every game |
| `StockfishEngine` (WebView), `webStockfish` (Stockfish 10 from a CDN) | `stockfishClient`: Stockfish 17.1, self-hosted, in a Web Worker |
| `PuzzleSolver`, `moveValidator`, `usePuzzleStore` | `TrainSection`, `puzzle.ts`, `useTraining` |
| `GameViewerScreen` (jump to the blunder) | `GameReview`: eval graph, arrows, move list, jump to mistakes |
| `OpeningLeaksScreen`, `OpeningDetailScreen`, `LeakBar` | Opening leaks table and opening explorer |
| Zustand persisted storage (daily cache) | IndexedDB, per player, versioned |
| `DashboardScreen` | Overview tab |

## What changed on purpose

- **Scoring bug fixed.** UCI scores are from the side to move's point of view. Fix My Chess treated them as White's, which makes blunder detection wrong for positions after a move. Scores are now converted once at the engine boundary (`toWhiteCp`) and tested, and the real engine was used to confirm the convention.
- **Win chance instead of a fixed 250 cp threshold.** A drop is measured in win chance, so equal and lost positions are treated sensibly. The cap of three blunders per game and ten in total is gone.
- **More than the best move.** A puzzle accepts any move that keeps the win chance within 5 points of the best, checked by the engine, instead of only the single best move.
- **Retry instead of three lives.** A wrong answer puts the puzzle back at the front of the deck until it is solved.
- **Opening names** use the family from Chess.com's opening URL (as Daily Gambit already did), so variations group together.
- **Bigger sample, better engine.** Up to 100 games (it was three months), Stockfish 17.1 NNUE (it was Stockfish 10), self-hosted instead of loaded from a CDN at runtime.

## New in Daily Gambit

Mistake types, time management, conversion of won and lost positions, repeated mistakes, the opening explorer, the games table and full game review, a training streak, and an accessible typed-move option for puzzles.

## Not brought over

- React Native, NativeWind, the iOS and Android projects, and the Nx workspace. For mobile, Daily Gambit is responsive and could become a PWA.
- The puzzle hint (highlighting the piece to move). "Show answer" replaces it.
- The "demo account tour" for players who have not played recently. Daily Gambit shows example players under the search box instead.
- The Playwright example test (it was the generator's placeholder).

## Verification

- 63 unit tests (`npm test`) covering scoring, classification, clocks, mistake types, conversion, patterns, the explorer, the puzzle logic and the deck.
- End to end in Chromium against live Chess.com data and the real engine: analysis, every tab, game review with keyboard navigation, puzzle solving by dragging and by typing, and persistence across a reload.
- Phone width (375 px): no horizontal overflow, no interactive control under 32 px high (the stylesheet asks for 44 px on narrow and touch screens).
- Accessibility: an automated axe-core run (WCAG 2.0 A, AA and 2.1 AA rules) finds no violations on any analysis tab.

## What is next

Moving the heavy work to a Node service (queue, workers, persistence), tracked separately. `src/lib/analysis` is plain TypeScript with no browser dependencies, so it can move into a shared package and run unchanged on a server.
