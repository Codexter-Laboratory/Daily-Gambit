import type { Prisma, PrismaClient } from '../db.js';
import type { AnalyzedGame } from '@daily-gambit/core';

/**
 * Bump when the shape or meaning of a stored analysis changes. Rows from an older version are
 * ignored, so those games get analysed again.
 */
export const SCHEMA_VERSION = 2;

export class AnalysisRepo {
  constructor(private readonly prisma: PrismaClient) {}

  async save(username: string, game: AnalyzedGame, depth: number): Promise<void> {
    const data = {
      endTime: game.meta.endTime,
      meta: game.meta as unknown as Prisma.InputJsonValue,
      analysis: game.analysis as unknown as Prisma.InputJsonValue,
      schema: SCHEMA_VERSION,
      engine: game.analysis.engine,
      depth,
    };
    await this.prisma.analyzedGame.upsert({
      where: { username_gameId: { username, gameId: game.meta.id } },
      create: { username, gameId: game.meta.id, ...data },
      update: data,
    });
  }

  /** Which of these games are already analysed with the current version of the analysis? */
  async existingIds(username: string, gameIds: string[]): Promise<Set<string>> {
    if (gameIds.length === 0) return new Set();
    const rows = await this.prisma.analyzedGame.findMany({
      where: { username, gameId: { in: gameIds }, schema: SCHEMA_VERSION },
      select: { gameId: true },
    });
    return new Set(rows.map((r) => r.gameId));
  }

  /** The player's analysed games, newest first. */
  async list(username: string, limit: number): Promise<AnalyzedGame[]> {
    const rows = await this.prisma.analyzedGame.findMany({
      where: { username, schema: SCHEMA_VERSION },
      orderBy: { endTime: 'desc' },
      take: limit,
      select: { meta: true, analysis: true },
    });
    return rows.map((r) => ({ meta: r.meta, analysis: r.analysis }) as unknown as AnalyzedGame);
  }
}
