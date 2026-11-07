import {
  toGameRecord,
  type ArchiveGame,
  type GameRecord,
} from '@daily-gambit/core';
import type {
  ChessComStats,
  CurrentGamesResponse,
  GameCategory,
  GamesSeries,
  PlayerClubsResponse,
  PlayerMatchesResponse,
  PlayerProfile,
  PlayerTournamentsResponse,
} from '@daily-gambit/contracts';
import { ChessComHttp, ChessComError, type RequestOptions } from './chessComHttp.js';

export { ChessComError } from './chessComHttp.js';

const BASE = 'https://api.chess.com/pub/player';
const ARCHIVE_CONCURRENCY = 4;

// Seconds. Slow-changing data is kept longer than data that changes with every game.
const TTL = { profile: 300, social: 300, live: 60, archives: 60, pastMonth: 21_600, currentMonth: 60 } as const;

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

/** Where the analysis worker gets games from. A fake in tests. */
export interface GamesSource {
  recentGames(params: { username: string; limit: number; timeClass?: string; signal?: AbortSignal }): Promise<AnalysisGame[]>;
}

/** What the read endpoints need. A fake in route tests. */
export interface PlayerData extends GamesSource {
  profile(username: string, o?: Fresh): Promise<PlayerProfile>;
  stats(username: string, o?: Fresh): Promise<ChessComStats>;
  clubs(username: string, o?: Fresh): Promise<PlayerClubsResponse>;
  tournaments(username: string, o?: Fresh): Promise<PlayerTournamentsResponse>;
  matches(username: string, o?: Fresh): Promise<PlayerMatchesResponse>;
  currentGames(username: string, o?: Fresh): Promise<CurrentGamesResponse>;
  gamesSeries(params: { username: string; timeClass: GameCategory; months: number } & Fresh & RequestOptions): Promise<GamesSeries>;
}

type Fresh = { fresh?: boolean } & RequestOptions;
type ArchiveIndex = { archives?: string[] };
type RawArchiveGame = ArchiveGame & { url?: string; pgn?: string; rules?: string; time_class?: string };

/** One game reduced to what the charts need, so a month can be cached in a fraction of its raw size. */
type SlimGame = { rules: string; timeClass: string; record: GameRecord };

const STANDARD = new Set(['bullet', 'blitz', 'rapid', 'daily']);

/**
 * Which games belong to the selected category? Standard categories are bullet, blitz, rapid and
 * daily chess (not variants). Chess.com puts the variant in `rules` and a variant game also has a
 * time class like "blitz", so without the rules check variant ratings leak into the standard curve.
 * Variant categories (chess960, crazyhouse, ...) live in `rules`.
 */
function inCategory(game: SlimGame, category: GameCategory): boolean {
  if (STANDARD.has(category)) return game.timeClass === category && game.rules === 'chess';
  return game.rules === category || game.timeClass === category;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const monthKey = (url: string) => url.split('/').slice(-2).join('-'); // ".../games/2026/11" -> "2026-11"
const isCurrentMonth = (url: string) => monthKey(url) === new Date().toISOString().slice(0, 7);

export class ChessComClient implements PlayerData {
  constructor(private readonly http: ChessComHttp = new ChessComHttp()) {}

  private player(username: string, path = '') {
    return `${BASE}/${encodeURIComponent(username)}${path}`;
  }

  profile(username: string, o: Fresh = {}) {
    return this.http.getJson<PlayerProfile>(this.player(username), { ttl: TTL.profile, ...o });
  }
  stats(username: string, o: Fresh = {}) {
    return this.http.getJson<ChessComStats>(this.player(username, '/stats'), { ttl: TTL.live, ...o });
  }
  clubs(username: string, o: Fresh = {}) {
    return this.http.getJson<PlayerClubsResponse>(this.player(username, '/clubs'), { ttl: TTL.social, ...o });
  }
  tournaments(username: string, o: Fresh = {}) {
    return this.http.getJson<PlayerTournamentsResponse>(this.player(username, '/tournaments'), { ttl: TTL.social, ...o });
  }
  matches(username: string, o: Fresh = {}) {
    return this.http.getJson<PlayerMatchesResponse>(this.player(username, '/matches'), { ttl: TTL.social, ...o });
  }
  currentGames(username: string, o: Fresh = {}) {
    return this.http.getJson<CurrentGamesResponse>(this.player(username, '/games'), { ttl: TTL.live, ...o });
  }

  private archives(username: string, o: Fresh = {}) {
    return this.http.getJson<ArchiveIndex>(this.player(username, '/games/archives'), { ttl: TTL.archives, ...o });
  }

  /** A month of the player's games, reduced and cached. An empty or unlisted month is simply empty. */
  private async month(username: string, url: string, o: Fresh): Promise<SlimGame[] | null> {
    try {
      return await this.http.cached(`cc:slim:${username}:${url}`, { ttl: isCurrentMonth(url) ? TTL.currentMonth : TTL.pastMonth, fresh: o.fresh }, async () => {
        const raw = await this.http.fetchJson<{ games?: RawArchiveGame[] }>(url, o);
        const out: SlimGame[] = [];
        for (const g of raw.games ?? []) {
          const record = toGameRecord(g, username, g.time_class ?? 'unknown');
          if (record) out.push({ rules: g.rules ?? 'chess', timeClass: g.time_class ?? record.timeClass, record });
        }
        return out;
      });
    } catch (e) {
      if (e instanceof ChessComError && e.status === 404) return []; // Chess.com lists months that have no games
      if (o.signal?.aborted) throw e;
      return null; // could not be loaded
    }
  }

  async gamesSeries({ username, timeClass, months, fresh, signal }: { username: string; timeClass: GameCategory; months: number } & Fresh): Promise<GamesSeries> {
    const index = await this.archives(username, { fresh, signal });
    const recent = (index.archives ?? []).slice(-Math.max(1, months));

    // A few months at a time: much faster than one by one, and still gentle on Chess.com.
    const results = await mapLimit(recent, ARCHIVE_CONCURRENCY, (url) => this.month(username, url, { fresh, signal }));
    const failed = results.filter((r) => r === null).length;
    if (recent.length > 0 && failed === recent.length) {
      // Every month failed: an error is more honest than an empty chart that says "no games".
      throw new ChessComError(502, 'No game archive could be loaded from Chess.com.');
    }

    const points: GameRecord[] = [];
    let win = 0;
    let loss = 0;
    let draw = 0;
    for (const game of results.flat()) {
      if (!game || !inCategory(game, timeClass)) continue;
      points.push(game.record);
      if (game.record.result === 'win') win += 1;
      else if (game.record.result === 'loss') loss += 1;
      else if (game.record.result === 'draw') draw += 1;
    }
    points.sort((a, b) => a.endTime - b.endTime);
    return { username, timeClass, months, points, summary: { games: points.length, win, loss, draw }, missingMonths: failed };
  }

  /** The player's newest standard-chess games with their PGN, for the engine. Raw months are not cached (they are large). */
  async recentGames({ username, limit, timeClass, signal }: { username: string; limit: number; timeClass?: string; signal?: AbortSignal }): Promise<AnalysisGame[]> {
    const index = await this.archives(username, { signal });
    const archives = [...(index.archives ?? [])].reverse();

    const games: AnalysisGame[] = [];
    let failed = 0;
    for (const url of archives) {
      if (games.length >= limit) break;
      let month: { games?: RawArchiveGame[] };
      try {
        month = await this.http.fetchJson<{ games?: RawArchiveGame[] }>(url, { signal });
      } catch (e) {
        if (e instanceof ChessComError && e.status === 404) continue; // listed, but empty
        if (signal?.aborted) throw e;
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
