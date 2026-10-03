/**
 * Chess.com usernames are letters, digits, underscores and hyphens (for example "eric-rosen").
 * Hyphens used to be rejected here, so those players could not be searched.
 */
export const USERNAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export const INVALID_USERNAME_MESSAGE =
  'Usernames can only contain letters, numbers, hyphens and underscores.';

/**
 * Turns whatever was typed or pasted into the canonical username: no spaces, lowercase, and
 * without a leading "@" or a chess.com/member/ link around it. It does not check validity;
 * use USERNAME_RE for that.
 */
export function normalizeUsername(input: string): string {
  let value = input.trim();
  const fromLink = value.match(/chess\.com\/member\/([^/?#\s]+)/i);
  if (fromLink) value = fromLink[1];
  return value.replace(/^@/, '').replace(/\s+/g, '').toLowerCase();
}

export const PLAYER_NOT_FOUND_MESSAGE =
  "Couldn't find that Chess.com username. Please check the spelling and try again.";

export const PLAYER_UNAVAILABLE_MESSAGE =
  "Couldn't reach Chess.com right now. Please try again in a moment.";
