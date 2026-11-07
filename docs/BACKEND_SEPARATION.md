# Backend separation

The analysis used to run entirely in the browser. It now has two modes: with `NEXT_PUBLIC_API_URL` set, a Node API does the work and stores the results; without it, the original browser analysis still runs. This page records what was decided and why.

## Layout

```
apps/web            Next.js frontend (and the Puzzle Rush snapshots, which still use its own Postgres)
apps/api            Fastify API and queue worker, with its own Postgres database
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
- **Browser mode kept.** If the API is not configured, the app still works on its own. That also keeps the web app deployable by itself.
- **The API has its own Prisma client output.** Both apps use Prisma with different schemas. By default they generate into the same `@prisma/client`, and whichever ran last would overwrite the other.

## What was measured

On a 4-CPU sandbox, depth 12, WebAssembly Stockfish under Node, 4 engine processes: 5 games in about 6 seconds and 8 games in about 10 seconds. The browser analysed one game at a time at about 2.5 seconds each. Different machines will differ.

## What this changes for users

- Results are saved on the server per Chess.com username, so they appear on any device. Verified by analysing in one browser and opening a fresh one with no local data.
- The privacy text in the app changes with the mode. With the API, analysis is stored on the server (public games only).

## What is next

1. Move training progress (solved puzzles, streak) to the server, keyed by an account.
2. Accounts and authentication.
3. Per-user rate limits, metrics and tracing.
4. Measure a native Stockfish binary against the WebAssembly build.
