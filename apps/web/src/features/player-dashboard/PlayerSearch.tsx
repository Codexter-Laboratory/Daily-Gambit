'use client';

import { UsernameSearch } from './UsernameSearch';
import { usePlayerSearch } from './usePlayerSearch';

/** The search box for pages that have no dashboard yet: the landing page and the not-found page. */
export function PlayerSearch({ initialError = null }: { initialError?: string | null }) {
  const { username, setUsername, error, isBusy, search } = usePlayerSearch({ initialError });
  return (
    <UsernameSearch
      username={username}
      onUsernameChange={setUsername}
      onSearch={search}
      isLoading={isBusy}
      activeUsername={null}
      error={error}
      typeToFocus
    />
  );
}
