import { toGameRecord, type ArchiveGame, type GameRecord } from '@daily-gambit/core';

const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'DailyGambit/1.0 (+https://github.com/Codexter-Laboratory/Daily-Gambit)',
};
const CACHE_TTL_MS = 60_000;

/** A Chess.com error that keeps the HTTP status, so routes can answer 404 and 502 correctly. */
export class ChessComError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ChessComError';
  }
}

/** A finished standard-chess game with its PGN, ready for the engine. */
export type AnalysisGame = {
  id: string;
  url: string;
  pgn: string;
  endTime: number;
  timeClass: string;
  color: 'white' | 'black';
  result: GameRecord['result'];
  ending: GameRecord['ending'];
};

export interface GamesSource {
  recentGames(params: { username: string; limit: number; timeClass?: string; signal?: AbortSignal }): Promise<AnalysisGame[]>;
}

type ArchiveWithMeta = ArchiveGame & { url?: string; pgn?: string; rules?: string; time_class?: string };

/** Reads the player's games from the Chess.com public API. Responses are cached briefly. */
export class ChessComClient implements GamesSource {
  private cache = new Map<string, { at: number; value: unknown }>();

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  private async getJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
    const hit = this.cache.get(url);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await this.fetchImpl(url, { headers: HEADERS, signal });
        if (res.ok) {
          const value = (await res.json()) as T;
          this.cache.set(url, { at: Date.now(), value });
          return value;
        }
        if (res.status === 404) throw new ChessComError(404, `Not found: ${url}`);
        if (res.status !== 429 && res.status < 500) throw new ChessComError(res.status, `Chess.com answered ${res.status}`);
      } catch (e) {
        if (e instanceof ChessComError || signal?.aborted) throw e;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    return null;
  }

  async recentGames({ username, limit, timeClass, signal }: { username: string; limit: number; timeClass?: string; signal?: AbortSignal }): Promise<AnalysisGame[]> {
    const index = await this.getJson<{ archives?: string[] }>(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`, signal);
    if (!index) throw new ChessComError(502, 'Chess.com is not answering right now.');
    const archives = [...(index.archives ?? [])].reverse();

    const games: AnalysisGame[] = [];
    let failed = 0;
    for (const url of archives) {
      if (games.length >= limit) break;
      let month: { games?: ArchiveWithMeta[] } | null;
      try {
        month = await this.getJson<{ games?: ArchiveWithMeta[] }>(url, signal);
      } catch (e) {
        // An empty month can be listed but return 404. Skip it and keep going.
        if (e instanceof ChessComError && e.status === 404) continue;
        throw e;
      }
      if (!month) {
        failed += 1;
        continue;
      }
      for (const g of [...(month.games ?? [])].sort((a, b) => (b.end_time ?? 0) - (a.end_time ?? 0))) {
        if ((g.rules ?? 'chess') !== 'chess' || !g.pgn || !g.url) continue;
        const record = toGameRecord(g, username, g.time_class ?? 'unknown');
        if (!record || record.result === 'other') continue;
        if (timeClass && record.timeClass !== timeClass) continue;
        games.push({
          id: g.url.split('/').pop() ?? g.url,
          url: g.url,
          pgn: g.pgn,
          endTime: record.endTime,
          timeClass: record.timeClass,
          color: record.color,
          result: record.result,
          ending: record.ending,
        });
        if (games.length >= limit) break;
      }
    }
    if (games.length === 0 && failed > 0 && failed === archives.length) {
      throw new ChessComError(502, 'No game archive could be loaded from Chess.com.');
    }
    return games;
  }
}
