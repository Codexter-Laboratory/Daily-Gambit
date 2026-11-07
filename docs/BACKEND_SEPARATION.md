# Backend separation

The web app used to be its own backend: Next.js route handlers fetched Chess.com, a Server Action and a cron job wrote Puzzle Rush snapshots to a database, and the engine analysis ran in the browser. All of that now lives in a Node API (`apps/api`), and the web app is a pure frontend. This page records what was decided and why.

## Layout

```
apps/web            Next.js frontend. No database, no route handlers, no Server Actions
apps/api            Fastify API and queue worker: Chess.com access, caching, engine analysis, its own Postgres
packages/core       the analysis logic: plain TypeScript, 63 tests, used by both
packages/contracts  the API's request schemas and response types, used by both
```

## Decisions

- **Next.js stays the frontend.** Player pages need server rendering so shared links preview properly. Moving to a plain React app would cost time and give nothing.
- **A separate Node service for the heavy work.** Engine analysis takes tens of seconds and many CPU cores. That does not fit serverless functions, and it should not block web requests.
- **A queue (BullMQ on Redis).** Retries, progress events, concurrency and cancellation come built in. The API answers at once and the work happens in a worker, which can be scaled separately.
- **Postgres for results.** The data is relational and results must outlive a browser. A different database from the web app's, so the services are independent.
- **Server-sent events for progress.** Progress is one-way, so SSE is simpler than WebSockets, works through proxies and reconnects by itself.
- **The shared core package.** The analysis code was already plain TypeScript. Moving it into `@daily-gambit/core` meant the server runs exactly the code the browser ran, with the same tests.
- **WebAssembly Stockfish under Node by default, native optional.** It needs nothing installed, so it works anywhere Node does. Set `STOCKFISH_PATH` to use a native binary (faster; not measured here).
- **Everything moved, not just the engine.** Two backends (route handlers in Next.js and a Node API) would mean two places for Chess.com access, caching and error handling. One backend is simpler to run, test and explain. The cost: the web app cannot show anything until the API is deployed.
- **One cache for Chess.com, in Redis.** The Next.js data cache is per deployment and cannot cache responses over 2 MB (a busy player's month of games is bigger). The API caches reduced data in Redis, shared by every API process, collapses simultaneous requests into one, remembers "not found" briefly and keeps working if Redis is down.
- **Limits before going public.** There are no accounts, so each client address has a daily job limit, the queue has a cap, and unknown players are refused before they are queued.
- **CORS accepts a list with wildcards**, so Vercel's per-deployment preview URLs can call the API.
- **Puzzle Rush was deleted.** Chess.com has no Puzzle Rush history, so the app recorded its own in a second database with a daily cron job. It was the only reason the web app needed a database, and it was already hidden at the bottom of the page. The old data is untouched in the old database.
- **The browser analysis mode was deleted.** It needed the web app to fetch games itself. Analysis always runs on the API now.
- **The online dot was deleted.** Chess.com's `is-online` endpoint no longer exists (it answers 404 "Data provider not found"), so the dot had silently been missing. The profile card shows "Last seen" from the profile instead.
- **The API has its own Prisma client output.** Both apps use Prisma with different schemas. By default they generate into the same `@prisma/client`, and whichever ran last would overwrite the other.

## What was measured

On a 4-CPU sandbox, depth 12, WebAssembly Stockfish under Node, 4 engine processes: 5 games in about 6 seconds and 8 games in about 10 seconds. The browser analysed one game at a time at about 2.5 seconds each. Different machines will differ.

## What this changes for users

- Results are saved on the server per Chess.com username, so they appear on any device. Verified by analysing in one browser and opening a fresh one with no local data.
- The privacy text says analysis is stored on the server (public games only).
- **Deploy the API before the web app.** The web app shows nothing without it.

## What is next

1. Move training progress (solved puzzles, streak) to the server, keyed by an account.
2. Accounts and authentication.
3. Per-user rate limits, metrics and tracing.
4. Measure a native Stockfish binary against the WebAssembly build.
5. Check puzzle answers with an API endpoint instead of Stockfish in the browser.
