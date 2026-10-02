import type { FormEvent } from 'react';

const EXAMPLE_PLAYERS = ['hikaru', 'magnuscarlsen', 'gothamchess', 'danielnaroditsky'];

type UsernameSearchProps = {
  username: string;
  onUsernameChange: (value: string) => void;
  onSearch: (username: string) => void;
  onRefreshCached: () => void;
  isLoading: boolean;
  activeUsername: string | null;
  error: string | null;
};

export function UsernameSearch({
  username,
  onUsernameChange,
  onSearch,
  onRefreshCached,
  isLoading,
  activeUsername,
  error,
}: UsernameSearchProps) {
  const hasUsername = username.trim().length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (hasUsername && !isLoading) onSearch(username);
  };

  const handleExample = (name: string) => {
    onUsernameChange(name);
    onSearch(name);
  };

  return (
    <form onSubmit={handleSubmit} role="search">
      <div className="searchBar">
        <span className="searchIcon" aria-hidden="true">♙</span>
        <input
          type="text"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          placeholder="Enter a Chess.com username"
          aria-label="Chess.com username"
          autoComplete="off"
          spellCheck={false}
        />
        <button className="btn btnPrimary" type="submit" disabled={isLoading || !hasUsername}>
          {isLoading ? <span className="spinner" aria-hidden="true" /> : null}
          {isLoading ? 'Loading…' : 'View stats'}
        </button>
      </div>

      <div className="searchMeta">
        <div className="chips">
          <span>Try:</span>
          {EXAMPLE_PLAYERS.map((name) => (
            <button
              key={name}
              type="button"
              className="chip"
              onClick={() => handleExample(name)}
              disabled={isLoading}
            >
              {name}
            </button>
          ))}
        </div>
        {activeUsername ? (
          <button
            type="button"
            className="btn btnGhost"
            onClick={onRefreshCached}
            disabled={isLoading}
            title="Redraw the streak and snapshot charts from data already saved, without calling Chess.com again."
          >
            ↻ Reload saved snapshots
          </button>
        ) : null}
      </div>

      {error ? <div className="errorBox" role="alert">{error}</div> : null}
    </form>
  );
}
