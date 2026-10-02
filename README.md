# Pawn Up

Pawn Up is a dashboard for Chess.com players. Type in a username and it pulls their ratings, clubs, tournaments, team matches, ongoing games and Puzzle Rush history from Chess.com's public API. It also keeps a daily Puzzle Rush streak, which Chess.com doesn't show you itself.

I built it because I play a lot on Chess.com and wanted one page that shows everything about my account, plus a way to see whether I'm actually doing puzzles every day.

## Built with

Next.js (App Router) and TypeScript, Tailwind CSS v4 for styling, TanStack Query for fetching and caching, Zustand for client state, Recharts for the charts and chess.js for anything that needs to understand a position. Puzzle Rush snapshots are stored in SQLite through Prisma. All player data comes from the [Chess.com PubAPI](https://www.chess.com/news/view/published-data-api).

## Running it locally

You'll need Node.js (the current LTS is fine) and npm.

```bash
npm install
cp .env.example .env.local
npx prisma migrate dev
npm run dev
```

The default `DATABASE_URL` points to a local SQLite file (`file:./dev.db`), so there's nothing else to set up. The app runs at http://localhost:3000.

Other commands you might need:

```bash
npm run build           # production build
npm run start           # serve the production build
npx prisma generate     # regenerate the Prisma client after changing the schema
npx prisma studio       # browse and edit the database in your browser
```

## How to use it

Enter a Chess.com username and pick one of the two buttons.

Load Player Stats fetches fresh data from Chess.com, saves today's Puzzle Rush snapshot and updates every chart and card on the page.

Refresh cached view redraws the dashboard from what's already stored, without hitting the API again.

## How the streak works

Chess.com only gives you running totals for Puzzle Rush, not a day-by-day history, so Pawn Up builds that history itself. Each time you press Load Player Stats, it saves a snapshot of your attempt count for that day. A day counts toward the streak if the count went up compared to the previous saved day.

The catch is that a day only gets recorded if you load your stats on it. If you puzzle on Tuesday but don't open Pawn Up until Thursday, Tuesday won't show up, so get in the habit of loading your stats on the days you play.
