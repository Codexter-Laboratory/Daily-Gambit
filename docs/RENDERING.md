# Rendering and caching

Which strategy each page uses, and why.

| Route | Strategy | How | Why |
| --- | --- | --- | --- |
| `/` | SSG | No dynamic APIs, so Next renders it at build time | The landing page is the same for everyone |
| `/player/[username]` | ISR | `export const revalidate = 60` plus an empty `generateStaticParams` | The profile card changes slowly and is the same for every visitor. First visit renders on the server, later visits get the cached HTML, and a request after 60 seconds regenerates it in the background |
| The charts, games, clubs and tournaments on the player page | CSR | `'use client'` components fetching `/api/*` | Interactive, and they depend on filters the user changes |
| `/?u=name` | Redirect | `proxy.ts` sends it to `/player/name` before any page runs | Old shared links keep working |
| `/api/*` | Route handlers (BFF) | Fetch Chess.com with the Next data cache | One shape for the UI, and Chess.com is not hit on every click |

There is no SSR page: nothing here is personal, so nothing needs to be rendered per request.

## Server and client components

- `app/page.tsx` and `app/player/[username]/page.tsx` are Server Components. The player page reads Chess.com directly (no HTTP hop to our own API) and renders the profile card, so that card ships no JavaScript.
- `PlayerSearch`, `PlayerDashboard`, `Avatar` and the sections under the dashboard are Client Components, kept to the parts that need state, effects or event handlers.
- The profile card is passed into `PlayerDashboard` as the `profile` prop. A Client Component can receive Server Components as props, so the card stays on the server.
- `Promise.all` starts the profile and online-status requests together (no waterfall). `getProfile` is wrapped in React `cache()`, so `generateMetadata` and the page share one request.

## Searching (`usePlayerSearch`)

The landing page, the not-found page and the dashboard share one search flow. A name is validated, then checked against Chess.com (`/api/profile`, cached for a few minutes), and the page navigates only if the player exists. A misspelled name leaves the URL and the current page alone and shows the error in the search box, so there is no flash of the next page. Searching for the player already on screen is the Refresh button.

## Server Actions (`features/player-dashboard/actions.ts`)

- `ingestSnapshot(username)` saves today's snapshot (`saveSnapshot`, the same function the daily cron uses). It replaces `GET /api/ingest`: a write should not be a GET, and Next checks the `Origin` header on Server Actions.
- `refreshPlayer(username)` is the Refresh button: it saves the snapshot, then calls `updateTag(playerTag(username))`, which expires every Chess.com response cached for that player and the cached page that used them.
- Each action is a public endpoint, so the input is validated with Zod inside it. There are no accounts in this app, so there is no auth check to make.

## The four Next.js caches, as used here

1. **Request memoization**: the same `fetch` or `cache()` call inside one render runs once (`getProfile`).
2. **Data cache**: `fetch(..., { next: { revalidate, tags } })` in `lib/chesscom.ts`. Every Chess.com fetch carries the tag `player:<username>`.
3. **Full route cache**: the ISR page for `/player/[username]`.
4. **Client router cache**: Next keeps visited pages in the browser, so Back is instant.

## Performance choices

- `next/dynamic` loads the charts (Recharts) as one separate chunk that downloads in parallel instead of sitting in the main bundle, so Recharts is not on the path to hydrating the page. Total JavaScript is about the same. Both charts are re-exported from `Charts.tsx` on purpose: dynamic imports of two separate modules each got their own copy of Recharts.
- `loading.tsx` is the Suspense fallback while a player page renders on the server.
- `next/image` for the avatar, `priority` and a fixed size (LCP, no layout shift). Hosts not listed in `images.remotePatterns` fall back to a plain `<img>`.
- `next/font` serves Inter from this site, with a size-matched fallback (no layout shift).
- Navigation uses `useTransition`, so the current page stays interactive while the next one renders.
- Measure the bundle with `npm run analyze`.

## Known limits

- `redirect()` inside a cached page is sent as a 200 that redirects in the browser, so the redirects that matter (`/?u=`, `/player/Hikaru`) live in `proxy.ts`, which runs before the cache.
- With ISR, an unknown player renders `not-found.tsx` with status 200 and a `noindex` tag, and that page is cached for 60 seconds. It is not a 404 status.
- A Chess.com outage does not break the page: the profile card is replaced by a short message (`getProfile` returns `unavailable`), and that page is cached for up to 60 seconds.
- `next/font/google` needs network access at build time.
- Not done on purpose: `React.memo` and list virtualization (the lists here are small, and the rule is to measure first), and Web Vitals reporting (there is nowhere to send it yet).
