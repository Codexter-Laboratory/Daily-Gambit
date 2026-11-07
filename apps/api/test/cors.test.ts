import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { originMatcher } from '../src/cors.js';
import { FakePlayers, startStack } from './helpers.js';

describe('originMatcher', () => {
  it('matches exact origins, ignoring a trailing slash', () => {
    const ok = originMatcher('https://app.example.com/, http://localhost:3000');
    expect(ok('https://app.example.com')).toBe(true);
    expect(ok('http://localhost:3000')).toBe(true);
    expect(ok('https://evil.example.com')).toBe(false);
    expect(ok('http://app.example.com')).toBe(false);
  });

  it('matches subdomains with a wildcard, and only real subdomains', () => {
    const ok = originMatcher('https://*.vercel.app');
    expect(ok('https://my-app-git-branch-team.vercel.app')).toBe(true);
    expect(ok('https://a.b.vercel.app')).toBe(true);
    expect(ok('https://vercel.app')).toBe(false);
    expect(ok('https://vercel.app.evil.com')).toBe(false);
    expect(ok('https://evilvercel.app')).toBe(false);
    expect(ok('http://x.vercel.app')).toBe(false);
  });

  it('allows nothing when nothing is configured', () => {
    expect(originMatcher('')('https://x.com')).toBe(false);
  });
});

describe('CORS on the API', () => {
  let stack: Awaited<ReturnType<typeof startStack>>;
  beforeAll(async () => {
    stack = await startStack(new FakePlayers(), { WEB_ORIGIN: 'https://app.example.com,https://*.vercel.app' });
  });
  afterAll(() => stack.stop());

  it('answers an allowed origin, including a preview deployment, and not others', async () => {
    const allowed = await stack.app.inject({ url: '/health', headers: { origin: 'https://app.example.com' } });
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.example.com');
    const preview = await stack.app.inject({ url: '/health', headers: { origin: 'https://dg-git-x.vercel.app' } });
    expect(preview.headers['access-control-allow-origin']).toBe('https://dg-git-x.vercel.app');
    const other = await stack.app.inject({ url: '/health', headers: { origin: 'https://evil.com' } });
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('handles the preflight for a JSON POST', async () => {
    const res = await stack.app.inject({
      method: 'OPTIONS',
      url: '/v1/analysis/jobs',
      headers: { origin: 'https://dg-git-x.vercel.app', 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
    });
    expect(res.statusCode).toBeLessThan(300);
    expect(res.headers['access-control-allow-origin']).toBe('https://dg-git-x.vercel.app');
    expect(String(res.headers['access-control-allow-methods'])).toContain('POST');
  });
});
