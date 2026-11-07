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

Only public Chess.com games are used. There are two modes:

- **With the analysis API** (`NEXT_PUBLIC_API_URL` set): Stockfish runs on the server and the analysed games are stored there under the player's username, so they show up on any device. Your training progress (solved puzzles, streak) stays in your browser.
- **Without it**: the engine runs on your device and everything is stored in your browser (IndexedDB). Nothing is uploaded.

The web app also stores Puzzle Rush snapshots in its own database (see below).

## Built with

**Frontend** (`apps/web`): Next.js (App Router), TypeScript, Tailwind CSS v4, Recharts, `react-chessboard`.
**Analysis API** (`apps/api`): Node, Fastify, BullMQ on Redis, Postgres through Prisma, Zod, [Stockfish](https://stockfishchess.org) 17.1.
**Shared** (`packages/`): the analysis logic (`core`) and the API contract (`contracts`), plain TypeScript used by both.
Tests run on Vitest, CI on GitHub Actions. All player data comes from the [Chess.com PubAPI](https://www.chess.com/news/view/published-data-api).

```
apps/web            Next.js frontend
apps/api            Fastify API and queue worker
packages/core       analysis logic (63 tests)
packages/contracts  API request schemas and response types
```

## Running it locally

You'll need Node.js 22+, npm and Docker (for Postgres and Redis). Without Docker, any Postgres 16 and Redis will do.

```bash
npm install                                # installs every workspace, copies the browser engine to apps/web/public/engine
docker compose up -d                       # Postgres and Redis for the API

cp apps/api/.env.example apps/api/.env     # check the values
npm run db:deploy                          # create the API's tables
npm run dev:api                            # API on http://localhost:4000 (the worker runs inside it)

cp apps/web/.env.example apps/web/.env     # set DATABASE_URL for Puzzle Rush; NEXT_PUBLIC_API_URL points at the API
npx prisma migrate dev --schema apps/web/prisma/schema.prisma
npm run dev                                # web on http://localhost:3000
```

The web app works without the API too: leave `NEXT_PUBLIC_API_URL` unset and the analysis runs in your browser. Its database is only used for Puzzle Rush snapshots.

```bash
npm test                    # unit tests: core and API configuration
npm run test:integration    # API tests against real Postgres, Redis and Stockfish (need DATABASE_URL and REDIS_URL for a throwaway database)
npm run typecheck           # every workspace
npm run build               # the web app
npm run build -w @daily-gambit/api
```

`npm install` runs `apps/web/scripts/copy-engine.mjs`, which copies the Stockfish WebAssembly files into `apps/web/public/engine` (about 7 MB, generated, not committed). If the browser engine does not start, run `node apps/web/scripts/copy-engine.mjs`.

## Deploying

### Web app on Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new) and set the **Root Directory** to `apps/web`. Keep "Include source files outside of the Root Directory" enabled, because the app uses `packages/core` and `packages/contracts`.
2. In the project's **Storage** tab, add a **Neon** Postgres database and connect it. This sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for Puzzle Rush.
3. In **Settings → Environment Variables**, add `CRON_SECRET` (any long random string, for example `openssl rand -hex 32`) and `NEXT_PUBLIC_API_URL` (the public URL of your API, or leave it unset to analyse in the browser).
4. Redeploy. The `vercel-build` script runs `prisma migrate deploy` before `next build`.

`apps/web/vercel.json` schedules `/api/cron/snapshots` once a day at about 23:30 UTC. It saves a Puzzle Rush snapshot for every player looked up in the last 90 days (up to 200).

### Analysis API

Run it on any host that can run a container or a Node process and reach Postgres and Redis (Railway, Fly.io, Render, a VM). Two processes from one build: the API (`node dist/index.js`) and one or more workers (`node dist/worker.js`). `apps/api/Dockerfile` builds an image for both (not yet built in CI). Set `DATABASE_URL`, `REDIS_URL` and `WEB_ORIGIN` (your web app's URL), run `npm run db:deploy` on each release, and see [docs/API.md](docs/API.md) for the full configuration.

## How to use it

On the home page you can just start typing. Enter a Chess.com username and press Enter or **View stats**, or pick an example player. You can also paste a profile link or type `@name`. Usernames can contain letters, numbers, hyphens and underscores. Daily Gambit checks that the player exists before it opens `/player/<username>`, which is a normal link you can share.

In the **Analysis** panel choose how many games (10 to 100) and which time control, then press **Analyse my games**. On the API it takes a few seconds for a handful of games; in the browser, roughly two to three seconds per game. You can stop at any time, and finished games are kept. Press **Analyse new games** later to add the newest ones, and games already analysed are skipped.

The **Games** section further down has its own filter (category and period, up to 3 years) that drives the rating history, activity heatmap, results by colour, score by opponent strength, how games end and top openings, all built from the player's monthly archives.

## How the pages are rendered

- The home page is static.
- A player page (`/player/<username>`) is rendered on the server and cached for 60 seconds. The profile card is a Server Component.
- Charts, games, analysis, clubs and tournaments load in the browser, because they depend on choices the user makes.
- Saving a Puzzle Rush snapshot and the Refresh button are Server Actions.

[docs/RENDERING.md](docs/RENDERING.md) has the details, [ARCHITECTURE.md](ARCHITECTURE.md) describes how the app is put together, [docs/API.md](docs/API.md) documents the analysis API and [docs/BACKEND_SEPARATION.md](docs/BACKEND_SEPARATION.md) explains why it was split out.

## Puzzle Rush

Chess.com's API has no Puzzle Rush history, so Daily Gambit records its own: one snapshot per player per day, saved when someone looks the player up and by the daily cron job. It now lives in the collapsed **More** section at the bottom of the player page. It is kept for now and can be removed without touching the analysis; see the notes in [ARCHITECTURE.md](ARCHITECTURE.md).

## Where this came from

The engine analysis, opening leaks and Daily Blunder Deck started as a separate React Native app, Fix My Chess. [docs/MIGRATION_FROM_FIX_MY_CHESS.md](docs/MIGRATION_FROM_FIX_MY_CHESS.md) records what was brought over, what changed and why.

## License notes

Stockfish is licensed under the GPL-3.0, and this app ships it to the browser. Before distributing a deployment, choose a licence for this project that is compatible with that and make the source available (see the Stockfish.js licence at https://github.com/nmrugg/stockfish.js).

## Disclaimer

Daily Gambit is an independent project and is not affiliated with, endorsed by or sponsored by Chess.com. Chess.com is a trademark of Chess.com, LLC. Player data comes from the public Chess.com PubAPI.
