# How the analysis works

Everything here lives in `packages/core` (`@daily-gambit/core`) as plain TypeScript with no React or browser APIs. The same code runs in the browser and in the API's worker, and is unit tested. The browser pieces are in `apps/web/src/features/analysis`; the server pieces are in `apps/api`.

## The pipeline

With the analysis API, steps 1 to 3 run in the API's worker (`apps/api/src/queue/processor.ts`) and results are stored in Postgres; the rest of this page is the same in both modes. In browser mode:

1. `/api/analysis-games` returns the player's most recent standard-chess games with their PGN (newest archive first, optional time-control filter, at most 100).
2. The browser starts Stockfish 17.1 (lite, single thread) in a Web Worker and evaluates **every position** of each game at depth 12, one at a time (`analyzeGame`). The final position of a finished game is scored from the result, with no engine call.
3. Each game is stored in IndexedDB as soon as it finishes, so stopping or reloading loses nothing.
4. All reports are pure functions over the stored games.

## Scores always from White's point of view

UCI engines report a score from the point of view of the side to move. `toWhiteCp` converts it once, at the engine boundary, and everything else uses White's point of view. Mating scores are clamped to ±10,000 centipawns.

## Win chance, move quality and accuracy

- **Win chance** (0 to 100) comes from the same logistic curve Lichess uses: `50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)`, with the score clamped to ±1000 cp.
- A move's **loss** is the win chance the mover had before it minus the win chance after it.
- **Classification** by win chance lost: inaccuracy at 10 points or more, mistake at 20, blunder at 30.
- **Move accuracy** is `103.1668 * exp(-0.04354 * loss) - 3.1669`, limited to 0 to 100. **Game accuracy** is the mean over your moves.

Using win chance instead of raw centipawns means a 200 cp slip matters a lot in an equal position and very little when you are already completely winning or losing.

## Phases

Moves 1 to 10 are the **opening**. After that, a position is an **endgame** when the two sides together have 26 points or less of knights, bishops, rooks and queens (pawns and kings not counted). Everything else is the **middlegame**.

## Mistake types (a heuristic)

For each mistake or blunder, `detectMotif` names what went wrong. This is a rule-based reading of the position, **not engine output**, so treat it as a guide. Checked in this order:

1. **Walked into a mate**: the evaluation after your move is a forced mate for the opponent.
2. **Missed a mate**: you had a forced mate before your move.
3. **Left a piece hanging**: after your move the opponent can win at least 3 points of material with a capture that is not adequately recaptured (a rough static exchange).
4. **Missed a free capture**: the best move wins a piece and you did not capture.
5. **Missed a tactic**: the best move is a capture, promotion or check.
6. **Positional**: everything else.

## Time

Chess.com PGNs contain `{[%clk h:mm:ss]}` comments. Time spent on a move is the previous clock, plus the increment, minus the new clock. **Time trouble** is a clock at or below the larger of 15 seconds and 10% of the starting time. Daily games have no clock data and are left out of time statistics.

## Conversion and turning points

A game counts as **clearly winning** if your win chance reached 80 or more at any point, and **clearly losing** if it dropped to 20 or less. "Thrown" means clearly winning but not a win. A game has a **turning point** when one of your moves lost 20 or more win-chance points, and the largest such move is marked.

## Repeated mistakes

Mistakes and blunders are grouped by position (the first four FEN fields, so move counters are ignored) and the move played. A group appearing in two or more different games is a repeated mistake.

## Opening explorer

A move tree built from your own games for one colour. For each move it shows games, your score, the average engine win chance after it, and how many times it was a mistake or blunder.

## Training puzzles

A puzzle is one of your mistakes or blunders where you were not already lost (win chance 30 or more before the move). The Daily Blunder Deck takes at most two per game, ranks by win chance lost, and shuffles with a seed based on the day, so a deck is stable all day. Puzzles you got wrong come back first until solved.

A move other than the engine's first choice is accepted when, after it, you keep your win chance to within 5 points (checked with a depth-10 evaluation).

## Where results are stored

With the API, in Postgres, one row per player and game, with an analysis version (`SCHEMA_VERSION`). In browser mode, in IndexedDB:

| Key | Contents | Version |
| --- | --- | --- |
| `dg:analysis:<username>` | Analysed games (moves, evaluations, errors, clocks) | 2 |
| `dg:training:<username>` | Which puzzles were solved or failed, and when | 1 |

When the stored shape changes the version is bumped and older entries are ignored (games are analysed again).

## Known limits

- Depth 12 on a lite single-thread engine is fast but not as deep as a desktop Stockfish. Mistake counts are a good guide, not a verdict.
- Standard chess only. Variants are skipped.
- Training progress (solved and failed puzzles, the streak) is still stored in the browser, so it does not follow you to another device. Analysis results do when the API is used.
