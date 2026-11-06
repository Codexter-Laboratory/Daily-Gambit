import { LoadingState } from '../../../components';
import { PlayerProfileSkeleton } from '../../../features/player-dashboard/PlayerProfileSection';

// Shown right away while the page waits for Chess.com. Next wraps the page in a Suspense
// boundary with this as the fallback, so the header and this skeleton stream first and the
// real page replaces them when it is ready.
export default function Loading() {
  return (
    <div className="stack dashboardPage">
      <PlayerProfileSkeleton />
      <LoadingState title="Stats" rows={3} />
      <div className="grid2">
        <LoadingState title="Rating history" rows={5} />
        <LoadingState title="Puzzle Rush" rows={5} />
      </div>
    </div>
  );
}
