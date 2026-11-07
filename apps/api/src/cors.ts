/**
 * Which web origins may call the API from a browser. `WEB_ORIGIN` is a comma-separated list. An
 * entry may start its host with `*.` to match any subdomain, for example `https://*.vercel.app`,
 * which is what per-deployment preview URLs need. The API serves public data without cookies, so
 * a wildcard does not expose anything private.
 */
export function originMatcher(spec: string): (origin: string) => boolean {
  const matchers = spec
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (!entry.includes('*')) return (origin: string) => origin === entry.replace(/\/+$/, '');
      // Each `*` stands for one or more DNS labels; everything else is literal.
      const pattern = entry
        .replace(/\/+$/, '')
        .split('*')
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('[a-z0-9-]+(?:\\.[a-z0-9-]+)*');
      const re = new RegExp(`^${pattern}$`, 'i');
      return (origin: string) => re.test(origin);
    });
  return (origin) => matchers.some((m) => m(origin));
}
