import type { Redis } from 'ioredis';

const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'DailyGambit/1.0 (+https://github.com/Codexter-Laboratory/Daily-Gambit)',
};

/** How long "this player does not exist" is remembered. Keeps made-up usernames from hammering Chess.com. */
const NOT_FOUND_TTL_SECONDS = 60;

/** A Chess.com failure that keeps the HTTP status, so routes can answer 404 and 502 correctly. */
export class ChessComError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ChessComError';
  }
}

type Envelope<T> = { ok: true; value: T } | { ok: false; status: number; message: string };

export type CacheOptions = {
  /** Seconds to keep the answer. */
  ttl: number;
  /** Skip the cache and fetch again. The new answer is still stored. */
  fresh?: boolean;
};

export type RequestOptions = { signal?: AbortSignal };

/**
 * Talks to the Chess.com public API for the whole service. It adds what that API needs and the
 * callers should not repeat:
 *  - a shared Redis cache, so several API processes do not ask Chess.com for the same thing
 *  - request collapsing: ten simultaneous requests for one thing make one Chess.com call
 *  - a short memory of "not found" answers
 *  - a timeout on every call, and one retry on rate limits, server errors and network errors
 * A broken Redis never breaks a request: the cache is skipped.
 */
export class ChessComHttp {
  private inflight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly redis: Redis | null = null,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 8_000
  ) {}

  /** One uncached call with a timeout and a single retry. Throws ChessComError. */
  async fetchJson<T>(url: string, { signal }: RequestOptions = {}): Promise<T> {
    let lastStatus = 502;
    for (let attempt = 0; attempt < 2; attempt++) {
      const timeout = AbortSignal.timeout(this.timeoutMs);
      try {
        const res = await this.fetchImpl(url, { headers: HEADERS, signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
        if (res.ok) return (await res.json()) as T;
        lastStatus = res.status;
        if (res.status === 404) throw new ChessComError(404, 'Chess.com does not have that.');
        // Anything else that is not a rate limit or a server error will not get better on a second try.
        if (res.status !== 429 && res.status < 500) throw new ChessComError(res.status, `Chess.com answered ${res.status}.`);
      } catch (e) {
        if (e instanceof ChessComError) throw e;
        if (signal?.aborted) throw e;
        // A timeout or a network error: try once more.
      }
      if (attempt === 0) await new Promise((r) => setTimeout(r, 300));
    }
    throw new ChessComError(lastStatus >= 500 || lastStatus === 429 ? 502 : lastStatus, 'Chess.com is not answering right now.');
  }

  /** A cached call. `key` identifies the answer; `compute` produces it when it is not cached. */
  async cached<T>(key: string, { ttl, fresh }: CacheOptions, compute: () => Promise<T>): Promise<T> {
    if (!fresh) {
      const hit = await this.read<T>(key);
      if (hit) return unwrap(hit);
    }
    const pending = this.inflight.get(key) as Promise<T> | undefined;
    if (pending) return pending;

    const run = (async () => {
      try {
        const value = await compute();
        await this.write(key, { ok: true, value }, ttl);
        return value;
      } catch (e) {
        if (e instanceof ChessComError && e.status === 404) {
          await this.write(key, { ok: false, status: 404, message: e.message }, Math.min(ttl, NOT_FOUND_TTL_SECONDS));
        }
        throw e;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, run);
    return run;
  }

  /** The common case: GET a Chess.com URL, cached. */
  getJson<T>(url: string, options: CacheOptions & RequestOptions): Promise<T> {
    return this.cached(`cc:${url}`, options, () => this.fetchJson<T>(url, options));
  }

  private async read<T>(key: string): Promise<Envelope<T> | undefined> {
    if (!this.redis) return undefined;
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as Envelope<T>) : undefined;
    } catch {
      return undefined; // a broken cache is a miss, not an error
    }
  }

  private async write<T>(key: string, envelope: Envelope<T>, ttl: number): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(key, JSON.stringify(envelope), 'EX', Math.max(1, Math.round(ttl)));
    } catch {
      // see read()
    }
  }
}

function unwrap<T>(envelope: Envelope<T>): T {
  if (envelope.ok) return envelope.value;
  throw new ChessComError(envelope.status, envelope.message);
}
