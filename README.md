# Daily Gambit

Daily Gambit is a dashboard for Chess.com players. Type in a username and it pulls their ratings, clubs, tournaments, team matches, ongoing games and Puzzle Rush history from Chess.com's public API. It also keeps a daily Puzzle Rush streak, which Chess.com doesn't show you itself.

I built it because I play a lot on Chess.com and wanted one page that shows everything about my account, plus a way to see whether I'm actually doing puzzles every day.

## Built with

Next.js (App Router) and TypeScript, Tailwind CSS v4 for styling, TanStack Query for fetching and caching, Zustand for client state, Recharts for the charts and chess.js for anything that needs to understand a position. Puzzle Rush snapshots are stored in Postgres through Prisma. All player data comes from the [Chess.com PubAPI](https://www.chess.com/news/view/published-data-api).

## Running it locally

You'll need Node.js (the current LTS is fine), npm and a Postgres database. A free [Neon](https://neon.tech) database works, as does a local Postgres.

```bash
npm install
cp .env.example .env
# edit .env and set DATABASE_URL and DATABASE_URL_UNPOOLED (both can be the same URL locally)
npx prisma migrate dev
npm run dev
```

The app runs at http://localhost:3000.

Other commands you might need:

```bash
npm run build           # production build
npm run start           # serve the production build
npx prisma generate     # regenerate the Prisma client after changing the schema
npx prisma studio       # browse and edit the database in your browser
```

## Deploying to Vercel

1. Import the repository at [vercel.com/new](https://vercel.com/new). The framework preset is detected as Next.js; leave the defaults.
2. In the project's **Storage** tab, add a **Neon** Postgres database and connect it to the project. This sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for you.
3. In **Settings → Environment Variables**, add `CRON_SECRET` with any long random string (for example the output of `openssl rand -hex 32`). Vercel sends it with each cron request, and the snapshot endpoint rejects requests without it.
4. Redeploy. The `vercel-build` script runs `prisma migrate deploy` before `next build`, so the tables are created on the first deploy.

`vercel.json` schedules `/api/cron/snapshots` once a day at about 23:30 UTC. It saves a Puzzle Rush snapshot for every player looked up in the last 90 days (up to 200), so their history keeps growing on days nobody opens their page.

## How to use it

Enter a Chess.com username and press Enter or **View stats**, or pick one of the example players under the search bar. Daily Gambit fetches fresh data from Chess.com, saves today's Puzzle Rush snapshot and fills in every chart and card on the page.

The page URL updates to `?u=<username>`, so you can share a link straight to a player's dashboard.

Once a player is loaded, the button changes to **Refresh**, which fetches the latest data for that player again.

The **Games** section has one filter row (category and period, up to 3 years) that drives every chart below it, all built from the player's monthly game archives:

- **Rating history**: rating after every game.
- **Activity**: games per day as a calendar heatmap.
- **Results by colour**: wins, draws and losses as White and as Black.
- **Score by opponent strength**: score against weaker and stronger opponents, next to the score the rating gap predicts.
- **How games end**: checkmate, resignation, time and so on, for wins, losses and draws.
- **Top openings**: most played openings as White and as Black, with results.

## Puzzle Rush history and the streak

Chess.com's API has no Puzzle Rush history: it returns the best run and, for some players, running daily totals. So Daily Gambit records the history itself, one snapshot per player per day, saved when someone looks the player up and by the daily cron job. Past days from before a player was first looked up can't be recovered.

The best score is saved every day, which is what the "Best score over time" chart is built from. A day counts toward the streak if the attempt count went up compared to the previous saved day; that needs the daily totals, which Chess.com doesn't return for every player.

## Disclaimer

Daily Gambit is an independent project and is not affiliated with, endorsed by or sponsored by Chess.com. Chess.com is a trademark of Chess.com, LLC. Player data comes from the public Chess.com PubAPI.
