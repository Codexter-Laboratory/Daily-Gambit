import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('needs a database URL and fills in sensible defaults', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
    const c = loadConfig({ DATABASE_URL: 'postgresql://x' });
    expect(c).toMatchObject({ PORT: 4000, ENGINE_DEPTH: 12, JOB_CONCURRENCY: 1, WEB_ORIGIN: 'http://localhost:3000' });
    expect(c.ENGINES_PER_JOB).toBeGreaterThanOrEqual(1);
  });
  it('rejects out-of-range values with a readable message', () => {
    expect(() => loadConfig({ DATABASE_URL: 'x', ENGINE_DEPTH: '99' })).toThrow(/ENGINE_DEPTH/);
  });
  it('embeds the worker outside production and separates it in production', () => {
    expect(loadConfig({ DATABASE_URL: 'x' }).EMBED_WORKER).toBe(true);
    expect(loadConfig({ DATABASE_URL: 'x', NODE_ENV: 'production' }).EMBED_WORKER).toBe(false);
    expect(loadConfig({ DATABASE_URL: 'x', NODE_ENV: 'production', EMBED_WORKER: 'true' }).EMBED_WORKER).toBe(true);
  });
});
