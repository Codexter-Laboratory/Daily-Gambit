# Rendering and caching

Which strategy each page uses, and why. The web app is a pure frontend: it has no route handlers, no Server Actions and no database. Everything it shows comes from the API (`apps/api`).

| Route | Strategy | How | Why |
| --- | --- | --- | --- |
| `/` | SSG | No dynamic APIs, so Next renders it at build time | The landing page is the same for everyone |
| `/player/[username]` | ISR | `export const revalidate = 60` plus an empty `generateStaticParams` | The profile card changes slowly and is the same for every visitor. First visit renders on the server, later visits get the cached HTML, and a request after 60 seconds regenerates it in the background |
| The charts, games, clubs, tournaments and analysis on the player page | CSR | `'use client'` components calling the API from the browser | Interactive, and they depend on choices the user makes |
| `/?u=name` | Redirect | `proxy.ts` sends it to `/player/name` before any page runs | Old shared links keep working |

There is no per-request SSR page: nothing here is personal, so nothing needs to be rendered per request.

## Server and client components

- `app/page.tsx` and `app/player/[username]/page.tsx` are Server Components. The player page asks the API for the profile (`getProfile`) and renders the card, so that card ships no JavaScript.
- `PlayerSearch`, `PlayerDashboard`, `Avatar`, the analysis hub and the sections under the dashboard are Client Components, kept to the parts that need state, effects or event handlers.
- The profile card is passed into `PlayerDashboard` as the `profile` prop. A Client Component can receive Server Components as props, so the card stays on the server.
- `getProfile` is wrapped in React `cache()`, so `generateMetadata` and the page share one request.

## Talking to the API

`lib/api.ts` is the only place that calls it. The address is `NEXT_PUBLIC_API_URL` (a default of `http://localhost:4000` in development; required in production). The browser calls the API directly, so the API allows the web origin through CORS (`WEB_ORIGIN`, which accepts a list and wildcards such as `https://*.vercel.app` for preview deployments). Server Components call it too, with `next: { revalidate: 60 }`.

## Searching (`usePlayerSearch`)

The landing page, the not-found page and the dashboard share one search flow. A name is validated, then checked against the API's profile endpoint, and the page navigates only if the player exists. A misspelled name leaves the URL and the current page alone and shows the error in the search box, so there is no flash of the next page. Searching for the player already on screen is the Refresh button, which reloads every section with `?fresh=1` so the API skips its cache.

## Caches, as used here

1. **API (Redis)**: Chess.com responses, shared by every API process. See the table in [ARCHITECTURE.md](../ARCHITECTURE.md).
2. **Request memoization**: the same `cache()` call inside one render runs once (`getProfile`).
3. **Full route cache**: the ISR page for `/player/[username]`, 60 seconds.
4. **Client router cache**: Next keeps visited pages in the browser, so Back is instant.

## Performance choices

- `next/dynamic` loads the charts (Recharts) as separate chunks that download in parallel instead of sitting in the main bundle.
- `loading.tsx` is the Suspense fallback while a player page renders on the server.
- `next/image` for the avatar, `priority` and a fixed size (LCP, no layout shift). Hosts not listed in `images.remotePatterns` fall back to a plain `<img>`.
- `next/font` serves Inter from this site, with a size-matched fallback (no layout shift).
- Navigation uses `useTransition`, so the current page stays interactive while the next one renders.
- Measure the bundle with `npm run analyze -w @daily-gambit/web`.

## Known limits

- `redirect()` inside a cached page is sent as a 200 that redirects in the browser, so the redirects that matter (`/?u=`, `/player/Hikaru`) live in `proxy.ts`, which runs before the cache.
- With ISR, an unknown player renders `not-found.tsx` with status 200 and a `noindex` tag, and that page is cached for 60 seconds. It is not a 404 status.
- An API outage does not break the page: the profile card is replaced by a short message (`getProfile` returns `unavailable`), and that page is cached for up to 60 seconds.
- `next/font/google` needs network access at build time.
- Not done on purpose: `React.memo` and list virtualization (the lists here are small, and the rule is to measure first), and Web Vitals reporting (there is nowhere to send it yet).
