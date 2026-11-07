import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** The module reads its address when it loads, so each test loads a fresh copy with the environment it wants. */
async function load(env: Record<string, string | undefined> = { NEXT_PUBLIC_API_URL: 'https://api.example.com/' }, nodeEnv = 'production') {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NODE_ENV', nodeEnv);
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v as string);
  return import('./api');
}

const reply = (status: number, body?: unknown, raw?: string) => new Response(raw ?? (body === undefined ? null : JSON.stringify(body)), { status });

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe('API address', () => {
  it('trims a trailing slash from the configured address', async () => {
    expect((await load()).API_URL).toBe('https://api.example.com');
  });
  it('defaults to the local API in development and has no default in production', async () => {
    expect((await load({ NEXT_PUBLIC_API_URL: '' }, 'development')).API_URL).toBe('http://localhost:4000');
    expect((await load({ NEXT_PUBLIC_API_URL: '' }, 'production')).API_URL).toBeNull();
  });
  it('says so plainly when production has no address', async () => {
    const { apiRequest } = await load({ NEXT_PUBLIC_API_URL: '' }, 'production');
    await expect(apiRequest('/x')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('NEXT_PUBLIC_API_URL') });
  });
});

describe('apiRequest', () => {
  it('returns the JSON body and calls the configured address', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(reply(200, { ok: 1 }));
    const { apiRequest } = await load();
    expect(await apiRequest('/v1/x')).toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/v1/x', undefined);
  });

  it('keeps the status and the API’s own message on an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reply(404, { error: 'Chess.com player not found.' }));
    const { apiRequest, ApiRequestError } = await load();
    const error = await apiRequest('/v1/x').catch((e) => e);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 404, message: 'Chess.com player not found.' });
  });

  it('survives an HTML error page from a gateway', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reply(504, undefined, '<html>Gateway Timeout</html>'));
    const { apiRequest } = await load();
    await expect(apiRequest('/v1/x')).rejects.toMatchObject({ status: 504, message: 'The server answered 504.' });
  });

  it('reports an unreachable server as status 0, so it is not mistaken for "not found"', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
    const { apiRequest } = await load();
    await expect(apiRequest('/v1/x')).rejects.toMatchObject({ status: 0 });
  });

  it('lets a cancelled request through as the abort it is', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('Aborted', 'AbortError'));
    const { apiRequest } = await load();
    await expect(apiRequest('/v1/x')).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('withFresh', () => {
  it('adds the fresh flag with the right separator, or nothing', async () => {
    const { withFresh } = await load();
    expect(withFresh('/a')).toBe('/a');
    expect(withFresh('/a', true)).toBe('/a?fresh=1');
    expect(withFresh('/a?x=1', true)).toBe('/a?x=1&fresh=1');
  });
});
