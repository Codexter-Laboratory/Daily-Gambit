import { defineConfig } from 'tsup';

// The two shared workspace packages are TypeScript source, so they are bundled in.
// Everything else stays an ordinary runtime dependency.
export default defineConfig({
  entry: { index: 'src/index.ts', worker: 'src/worker.ts' },
  format: ['esm'],
  target: 'node22',
  clean: true,
  noExternal: ['@daily-gambit/core', '@daily-gambit/contracts'],
  // The generated Prisma client carries its own engine files, so it stays a separate import.
  external: [/generated\/client/],
});
