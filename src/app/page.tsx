'use client';

import { Suspense } from 'react';
import { PlayerDashboard } from '../features/player-dashboard';

export default function Page() {
  // useSearchParams() inside the dashboard needs a Suspense boundary.
  return (
    <Suspense>
      <PlayerDashboard />
    </Suspense>
  );
}
