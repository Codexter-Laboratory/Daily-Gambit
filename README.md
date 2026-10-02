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
3. Redeploy. The `vercel-build` script runs `prisma migrate deploy` before `next build`, so the tables are created on the first deploy.

## How to use it

Enter a Chess.com username and press Enter or **View stats**, or pick one of the example players under the search bar. Daily Gambit fetches fresh data from Chess.com, saves today's Puzzle Rush snapshot and fills in every chart and card on the page.

The page URL updates to `?u=<username>`, so you can share a link straight to a player's dashboard.

Once a player is loaded, **Reload saved snapshots** redraws the streak and snapshot charts from what's already in the database, without calling Chess.com again.

## How the streak works

Chess.com only gives you running totals for Puzzle Rush, not a day-by-day history, so Daily Gambit builds that history itself. Each time you look a player up, it saves a snapshot of your attempt count for that day. A day counts toward the streak if the count went up compared to the previous saved day.

The catch is that a day only gets recorded if you load your stats on it. If you puzzle on Tuesday but don't open Daily Gambit until Thursday, Tuesday won't show up, so get in the habit of loading your stats on the days you play.

## Disclaimer

Daily Gambit is an independent project and is not affiliated with, endorsed by or sponsored by Chess.com. Chess.com is a trademark of Chess.com, LLC. Player data comes from the public Chess.com PubAPI.
