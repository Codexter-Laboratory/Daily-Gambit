import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AnalyzedGame } from '@daily-gambit/core';
import { createDeps } from '../src/bootstrap.js';
import { SCHEMA_VERSION } from '../src/services/repo.js';
import { testConfig } from './helpers.js';

const deps = createDeps(testConfig());
const game = (id: string, endTime: number): AnalyzedGame =>
  ({ meta: { id, url: `u/${id}`, endTime, timeClass: 'blitz', color: 'white', result: 'win', ending: 'resignation' }, analysis: { gameId: id, engine: 'test', accuracy: 90 } }) as unknown as AnalyzedGame;

beforeAll(() => deps.prisma.$connect());
beforeEach(async () => {
  await deps.prisma.analyzedGame.deleteMany();
});
afterAll(() => deps.close());

describe('AnalysisRepo', () => {
  it('saves a game and lists the newest first', async () => {
    await deps.repo.save('alice', game('a', 100), 12);
    await deps.repo.save('alice', game('b', 300), 12);
    await deps.repo.save('alice', game('c', 200), 12);
    expect((await deps.repo.list('alice', 10)).map((g) => g.meta.id)).toEqual(['b', 'c', 'a']);
    expect((await deps.repo.list('alice', 2)).map((g) => g.meta.id)).toEqual(['b', 'c']);
  });

  it('keeps players apart and updates instead of duplicating', async () => {
    await deps.repo.save('alice', game('a', 100), 12);
    await deps.repo.save('alice', game('a', 100), 14);
    await deps.repo.save('bob', game('a', 100), 12);
    expect(await deps.prisma.analyzedGame.count()).toBe(2);
    expect((await deps.repo.list('alice', 10))).toHaveLength(1);
  });

  it('knows which games are already analysed, and ignores rows from an older analysis version', async () => {
    await deps.repo.save('alice', game('a', 100), 12);
    await deps.repo.save('alice', game('b', 200), 12);
    await deps.prisma.analyzedGame.update({ where: { username_gameId: { username: 'alice', gameId: 'b' } }, data: { schema: SCHEMA_VERSION - 1 } });
    expect([...(await deps.repo.existingIds('alice', ['a', 'b', 'c']))]).toEqual(['a']);
    expect((await deps.repo.list('alice', 10)).map((g) => g.meta.id)).toEqual(['a']);
    expect((await deps.repo.existingIds('alice', [])).size).toBe(0);
  });
});
