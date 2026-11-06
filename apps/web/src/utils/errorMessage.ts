export function toFriendlyErrorMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const msg = raw.toLowerCase();

  if (msg.includes('404') || msg.includes('not found')) {
    return "Couldn't find that Chess.com username. Please check the spelling and try again.";
  }
  if (msg.includes('invalid username') || msg.includes('missing or invalid username')) {
    return 'Please enter a valid Chess.com username.';
  }
  return raw || fallback;
}
