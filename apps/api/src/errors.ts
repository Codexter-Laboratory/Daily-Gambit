/** An error that carries the HTTP status (and headers) the client should get. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly headers: Record<string, string> = {}
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Seconds until the next UTC midnight, for Retry-After on a daily limit. */
export function secondsUntilUtcMidnight(now = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}
