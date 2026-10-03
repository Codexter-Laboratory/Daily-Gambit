import { Hero } from '../features/player-dashboard/Hero';
import { PlayerSearch } from '../features/player-dashboard/PlayerSearch';

// Nothing on the landing page depends on the request, so Next renders it once at build
// time and serves it as static HTML (SSG). Only the search box is a client component.
export default function Page() {
  return (
    <Hero>
      <PlayerSearch />
    </Hero>
  );
}
