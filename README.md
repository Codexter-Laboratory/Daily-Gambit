# Daily Gambit

Daily Gambit is a chess improvement dashboard for Chess.com players. Type in a username and Stockfish reviews your recent games in your browser, then shows you where you lose points: which openings leak, what kind of mistakes you repeat, how you use the clock, and which winning positions you throw away. Your own mistakes become a daily puzzle set to practise.

It also shows the usual account overview (ratings, rating history, activity, results by colour, game endings and top openings), with live games, clubs, tournaments and Puzzle Rush in a collapsed section at the bottom.

## What you get

On a player page, after you press **Analyse my games**:

| Tab | What it shows |
| --- | --- |
| **Overview** | "Fix this first" (the biggest problems in plain sentences), average accuracy, blunders per game, how often you convert winning positions and save losing ones, and an accuracy trend |
| **Openings** | Opening leaks ranked by points lost, and an opening explorer: walk your own repertoire move by move and see games, score, engine win chance and mistakes for each move and each opponent reply |
| **Mistakes** | What kind of mistakes you make (hanging pieces, missed captures, missed mates, missed tactics, positional), which piece you move when you go wrong, where in the game errors happen, and the exact mistakes you repeat across games |
| **Time** | Time per move, errors with time against in time trouble, fast mistakes, and losses on the clock |
| **Games** | Every analysed game, sortable by accuracy or errors, with a full game review: eval graph, arrows for your move against the engine's, move list marked `?!` `?` `??`, clocks, and jump to the previous or next mistake |
| **Train** | The Daily Blunder Deck: five puzzles from your own mistakes. Drag a piece or type the move. A different move counts if Stockfish agrees it is still good. Puzzles you get wrong come back first. A streak counts the days you trained |

[docs/ANALYSIS.md](docs/ANALYSIS.md) explains exactly how each number is produced.

## Privacy

Games are fetched from Chess.com's public API through this app's server. The engine runs **on your device**, and the analysis and your training progress are stored in your browser (IndexedDB). Nothing about your analysis is uploaded. Clearing site data resets it. The only thing stored on the server is Puzzle Rush snapshots (see below).

## Built with

Next.js (App Router) and TypeScript, Tailwind CSS v4, Recharts, `react-chessboard`, `chess.js`, and [Stockfish](https://stockfishchess.org) 17.1 (single-thread WebAssembly) in a Web Worker. Server side: route handlers, Zod, and Postgres through Prisma. Tests run on Vitest, and CI runs on GitHub Actions. All player data comes from the [Chess.com PubAPI](https://www.chess.com/news/view/published-data-api).

## Running it locally

You'll need Node.js (the current LTS is fine), npm and a Postgres database. A free [Neon](https://neon.tech) database works, as does a local Postgres. The database is only used for Puzzle Rush snapshots, so everything else works without it.

```bash
npm install            # also copies the Stockfish engine to public/engine
cp .env.example .env
# edit .env and set DATABASE_URL and DATABASE_URL_UNPOOLED (both can be the same URL locally)
npx prisma migrate dev
npm run dev
```

The app runs at http://localhost:3000.

Other commands you might need:

```bash
npm test                # unit tests (Vitest)
npm run typecheck       # TypeScript
npm run build           # production build
npm run start           # serve the production build
npm run analyze         # open the bundle analyzer
npx prisma studio       # browse the database
```

`npm install` runs `scripts/copy-engine.mjs`, which copies the Stockfish WebAssembly files from `node_modules/stockfish` into `public/engine`. Those files (about 7 MB) are generated, so they are not committed. If the engine does not start, run `node scripts/copy-engine.mjs`.

## Deploying to Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new). The framework preset is detected as Next.js; leave the defaults.
2. In the project's **Storage** tab, add a **Neon** Postgres database and connect it to the project. This sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for you.
3. In **Settings → Environment Variables**, add `CRON_SECRET` with any long random string (for example the output of `openssl rand -hex 32`). Vercel sends it with each cron request, and the snapshot endpoint rejects requests without it.
4. Redeploy. The `vercel-build` script runs `prisma migrate deploy` before `next build`, so the tables are created on the first deploy. The install step also copies the engine into `public/engine`.

`vercel.json` schedules `/api/cron/snapshots` once a day at about 23:30 UTC. It saves a Puzzle Rush snapshot for every player looked up in the last 90 days (up to 200), so their history keeps growing on days nobody opens their page.

## How to use it

On the home page you can just start typing. Enter a Chess.com username and press Enter or **View stats**, or pick an example player. You can also paste a profile link or type `@name`. Usernames can contain letters, numbers, hyphens and underscores. Daily Gambit checks that the player exists before it opens `/player/<username>`, which is a normal link you can share.

In the **Analysis** panel choose how many games (10 to 100) and which time control, then press **Analyse my games**. It takes roughly two to three seconds per game on a typical laptop. You can stop at any time, and finished games are kept. Press **Analyse new games** later to add the newest ones.

The **Games** section further down has its own filter (category and period, up to 3 years) that drives the rating history, activity heatmap, results by colour, score by opponent strength, how games end and top openings, all built from the player's monthly archives.

## How the pages are rendered

- The home page is static.
- A player page (`/player/<username>`) is rendered on the server and cached for 60 seconds. The profile card is a Server Component.
- Charts, games, analysis, clubs and tournaments load in the browser, because they depend on choices the user makes.
- Saving a Puzzle Rush snapshot and the Refresh button are Server Actions.

[docs/RENDERING.md](docs/RENDERING.md) has the details, and [ARCHITECTURE.md](ARCHITECTURE.md) describes how the app is put together.

## Puzzle Rush

Chess.com's API has no Puzzle Rush history, so Daily Gambit records its own: one snapshot per player per day, saved when someone looks the player up and by the daily cron job. It now lives in the collapsed **More** section at the bottom of the player page. It is kept for now and can be removed without touching the analysis; see the notes in [ARCHITECTURE.md](ARCHITECTURE.md).

## Where this came from

The engine analysis, opening leaks and Daily Blunder Deck started as a separate React Native app, Fix My Chess. [docs/MIGRATION_FROM_FIX_MY_CHESS.md](docs/MIGRATION_FROM_FIX_MY_CHESS.md) records what was brought over, what changed and why.

## License notes

Stockfish is licensed under the GPL-3.0, and this app ships it to the browser. Before distributing a deployment, choose a licence for this project that is compatible with that and make the source available (see the Stockfish.js licence at https://github.com/nmrugg/stockfish.js).

## Disclaimer

Daily Gambit is an independent project and is not affiliated with, endorsed by or sponsored by Chess.com. Chess.com is a trademark of Chess.com, LLC. Player data comes from the public Chess.com PubAPI.
