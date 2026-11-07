import { useEffect, useRef, type FormEvent } from 'react';
import { normalizeUsername } from '../../lib/username';

const EXAMPLE_PLAYERS = ['hikaru', 'magnuscarlsen', 'gothamchess', 'danielnaroditsky'];

type UsernameSearchProps = {
  username: string;
  onUsernameChange: (value: string) => void;
  onSearch: (username: string) => void;
  isLoading: boolean;
  activeUsername: string | null;
  error: string | null;
  /** Typing anywhere on the page, without clicking the box first, starts typing in it. */
  typeToFocus?: boolean;
};

export function UsernameSearch({
  username,
  onUsernameChange,
  onSearch,
  isLoading,
  activeUsername,
  error,
  typeToFocus = false,
}: UsernameSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!typeToFocus) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      // Leave shortcuts alone (Ctrl/Cmd+F, Cmd+R, ...). Only a printable character counts.
      // Space is left out because it scrolls the page.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length !== 1 || e.key === ' ') return;
      // Do not steal the key from something the user is already using.
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.isContentEditable || target?.closest('input, textarea, select, button, a, [role="dialog"]')) return;
      // Moving focus during keydown means this same key is then typed into the box.
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [typeToFocus]);

  const cleanUsername = normalizeUsername(username);
  const hasUsername = cleanUsername.length > 0;
  // Typing the player that's already on screen turns the button into a refresh.
  const isRefresh = activeUsername !== null && cleanUsername === activeUsername;

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
          ref={inputRef}
          type="text"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          placeholder="Enter a Chess.com username"
          aria-label="Chess.com username"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          className={isRefresh ? 'btn' : 'btn btnPrimary'}
          type="submit"
          disabled={isLoading || !hasUsername}
          aria-busy={isLoading}
          title={isRefresh ? 'Fetch the latest data from Chess.com and save today\'s Puzzle Rush snapshot' : undefined}
        >
          {isLoading ? <span className="spinner" aria-hidden="true" /> : null}
          {isLoading ? 'Loading…' : isRefresh ? '↻ Refresh' : 'View stats'}
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
      </div>

      {error ? <div className="errorBox" role="alert">{error}</div> : null}
    </form>
  );
}
