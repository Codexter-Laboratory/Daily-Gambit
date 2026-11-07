# Daily Gambit

Daily Gambit is a chess improvement dashboard for Chess.com players. Type in a username and Stockfish reviews your recent games in your browser, then shows you where you lose points: which openings leak, what kind of mistakes you repeat, how you use the clock, and which winning positions you throw away. Your own mistakes become a daily puzzle set to practise.

It also shows the usual account overview (ratings, rating history, activity, results by colour, game endings and top openings), with live games, clubs and tournaments in a collapsed section at the bottom.

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

Only public Chess.com games are used. Stockfish runs on the server, and the analysed games are stored there under the player's Chess.com username, so they show up on any device. Your training progress (solved puzzles, streak) stays in your browser.

## Built with

**Frontend** (`apps/web`): Next.js (App Router), TypeScript, Tailwind CSS v4, Recharts, `react-chessboard`. No database: it only talks to the API.
**API** (`apps/api`): Node, Fastify, BullMQ and a response cache on Redis, Postgres through Prisma, Zod, [Stockfish](https://stockfishchess.org) 17.1. It owns all Chess.com access and the engine analysis.
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
npm install                                # installs every workspace and copies the browser engine to apps/web/public/engine
docker compose up -d                       # Postgres and Redis for the API

cp apps/api/.env.example apps/api/.env     # check the values
npm run db:deploy                          # create the API's tables
npm run dev:api                            # API on http://localhost:4000 (the worker runs inside it)

npm run dev                                # web on http://localhost:3000 (it finds the API at localhost:4000)
```

The web app needs the API for everything it shows. To point it somewhere else set `NEXT_PUBLIC_API_URL` (see `apps/web/.env.example`).

```bash
npm test                    # unit tests: core, web and the API's configuration
npm run test:integration    # the API's tests against real Postgres, Redis and Stockfish (need DATABASE_URL and REDIS_URL for a throwaway database)
npm run typecheck           # every workspace
npm run build               # the web app
npm run build -w @daily-gambit/api
```

`npm install` runs `apps/web/scripts/copy-engine.mjs`, which copies the Stockfish WebAssembly files into `apps/web/public/engine` (about 7 MB, generated, not committed). The browser uses it to check puzzle answers. If it does not start, run `node apps/web/scripts/copy-engine.mjs`.

## Deploying

Deploy the **API first**: the web app cannot show anything without it.

### Analysis and data API

Run it on any host that can run a container or a Node process and reach Postgres and Redis (Railway, Fly.io, Render, a VM). Two processes from one build: the API (`node dist/index.js`) and one or more workers (`node dist/worker.js`). `apps/api/Dockerfile` builds an image for both (not yet built in CI). Set `DATABASE_URL`, `REDIS_URL` and `WEB_ORIGIN` (your web app's URL, with `https://*.vercel.app` too if you want preview deployments to work), set `TRUST_PROXY=true` only if the API sits behind a proxy you control, run `npm run db:deploy` on each release, and see [docs/API.md](docs/API.md) for the full configuration and limits.

### Web app on Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new) and set the **Root Directory** to `apps/web`. Keep "Include source files outside of the Root Directory" enabled, because the app uses `packages/core` and `packages/contracts`.
2. In **Settings → Environment Variables**, add `NEXT_PUBLIC_API_URL` (the public URL of your API). It is read at build time, so redeploy after changing it. No database or cron job is needed.
3. Deploy.

## How to use it

On the home page you can just start typing. Enter a Chess.com username and press Enter or **View stats**, or pick an example player. You can also paste a profile link or type `@name`. Usernames can contain letters, numbers, hyphens and underscores. Daily Gambit checks that the player exists before it opens `/player/<username>`, which is a normal link you can share.

In the **Analysis** panel choose how many games (10 to 100) and which time control, then press **Analyse my games**. On the API it takes a few seconds for a handful of games; in the browser, roughly two to three seconds per game. You can stop at any time, and finished games are kept. Press **Analyse new games** later to add the newest ones, and games already analysed are skipped.

The **Games** section further down has its own filter (category and period, up to 3 years) that drives the rating history, activity heatmap, results by colour, score by opponent strength, how games end and top openings, all built from the player's monthly archives.

## How the pages are rendered

- The home page is static.
- A player page (`/player/<username>`) is rendered on the server and cached for 60 seconds. The profile card is a Server Component.
- Charts, games, analysis, clubs and tournaments load in the browser, straight from the API, because they depend on choices the user makes.

[docs/RENDERING.md](docs/RENDERING.md) has the details, [ARCHITECTURE.md](ARCHITECTURE.md) describes how the app is put together, [docs/API.md](docs/API.md) documents the analysis API and [docs/BACKEND_SEPARATION.md](docs/BACKEND_SEPARATION.md) explains why it was split out.

## Where this came from

The engine analysis, opening leaks and Daily Blunder Deck started as a separate React Native app, Fix My Chess. [docs/MIGRATION_FROM_FIX_MY_CHESS.md](docs/MIGRATION_FROM_FIX_MY_CHESS.md) records what was brought over, what changed and why.

## License notes

Stockfish is licensed under the GPL-3.0, and this app ships it to the browser. Before distributing a deployment, choose a licence for this project that is compatible with that and make the source available (see the Stockfish.js licence at https://github.com/nmrugg/stockfish.js).

## Disclaimer

Daily Gambit is an independent project and is not affiliated with, endorsed by or sponsored by Chess.com. Chess.com is a trademark of Chess.com, LLC. Player data comes from the public Chess.com PubAPI.
