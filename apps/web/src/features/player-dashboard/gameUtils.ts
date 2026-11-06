export function getOpponentUsername(game: Record<string, unknown>, currentUsername: string): string {
  const whiteUrl = typeof game.white === 'string' ? game.white : (game.white as { url?: string })?.url;
  const blackUrl = typeof game.black === 'string' ? game.black : (game.black as { url?: string })?.url;
  const whiteUsername = (whiteUrl ?? '').split('/').pop() || '';
  const blackUsername = (blackUrl ?? '').split('/').pop() || '';
  if (whiteUsername === currentUsername) {
    return blackUsername.charAt(0).toUpperCase() + blackUsername.slice(1);
  }
  return whiteUsername.charAt(0).toUpperCase() + whiteUsername.slice(1);
}

export function getMyColor(game: Record<string, unknown>, currentUsername: string): string {
  const whiteUrl = typeof game.white === 'string' ? game.white : (game.white as { url?: string })?.url;
  const blackUrl = typeof game.black === 'string' ? game.black : (game.black as { url?: string })?.url;
  const whiteUsername = (whiteUrl ?? '').split('/').pop() || '';
  const blackUsername = (blackUrl ?? '').split('/').pop() || '';
  if (whiteUsername === currentUsername) return 'white';
  if (blackUsername === currentUsername) return 'black';
  return 'unknown';
}
