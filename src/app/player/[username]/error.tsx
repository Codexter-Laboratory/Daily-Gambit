'use client';

import { startTransition } from 'react';
import { useRouter } from 'next/navigation';

// An error boundary for this route: an unexpected error while rendering lands here instead of crashing the app.
// (A Chess.com outage does not: the page degrades without the profile card, see getProfile.)
// Errors from Server Components reach it with the details hidden in production.
export default function PlayerError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="stack">
      <div className="errorBox" role="alert">
        Something went wrong while loading this player. Please try again in a moment.
      </div>
      <div>
        <button
          className="btn btnPrimary"
          type="button"
          onClick={() =>
            // refresh() asks the server for the page again, reset() clears the error once that is back.
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
        >
          Try again
        </button>
      </div>
    </div>
  );
}
