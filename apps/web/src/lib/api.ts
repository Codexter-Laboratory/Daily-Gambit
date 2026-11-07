/**
 * Where the Daily Gambit API lives. Everything the app shows comes from it. In development it
 * defaults to the local API; in production it must be set (NEXT_PUBLIC_API_URL), because a
 * missing address would otherwise only show up as mysterious errors.
 */
export const API_URL: string | null =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || (process.env.NODE_ENV === 'production' ? null : 'http://localhost:4000');

/** An API call that failed. Keeps the HTTP status so callers can tell 404 from 5xx (status 0 means the API could not be reached). */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/**
 * Calls the API and returns its JSON. The body is read defensively: a gateway timeout can return
 * HTML, and `res.json()` on that would throw a confusing parse error. Any non-2xx answer becomes
 * an ApiRequestError carrying the API's own message when it sent one.
 */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new ApiRequestError(0, 'The server address is not configured (NEXT_PUBLIC_API_URL).');
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e; // the caller cancelled; not a failure
    throw new ApiRequestError(0, 'Could not reach the server. Check your connection and try again.');
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // not JSON: keep null
  }
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error;
    throw new ApiRequestError(res.status, message ?? `The server answered ${res.status}.`);
  }
  return body as T;
}

/** `?fresh=1` asks the API to skip its cache. */
export const withFresh = (path: string, fresh?: boolean) => (fresh ? `${path}${path.includes('?') ? '&' : '?'}fresh=1` : path);
