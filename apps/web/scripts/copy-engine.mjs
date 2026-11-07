// Copies the Stockfish WASM build into public/engine so the browser can load it from our own origin.
// Runs on postinstall. The files are build output (about 7 MB), so they are not committed.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dest = join(here, '..', 'public', 'engine');

// In a workspace the package is usually hoisted to the repo root, so resolve it instead of assuming a path.
let src;
try {
  src = join(dirname(createRequire(import.meta.url).resolve('stockfish/package.json')), 'src');
} catch {
  console.warn('copy-engine: stockfish is not installed, skipping.');
  process.exit(0);
}

const files = readdirSync(src);
const js = files.find((f) => /^stockfish-.*lite-single-[0-9a-f]+\.js$/.test(f));
const wasm = js?.replace(/\.js$/, '.wasm');
if (!js || !wasm || !files.includes(wasm) || !existsSync(join(src, js))) {
  console.error('copy-engine: could not find the lite single-thread build in the stockfish package.');
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
// The engine looks for "<script name>.wasm" next to the script, so both get the same base name.
copyFileSync(join(src, js), join(dest, 'stockfish-lite.js'));
copyFileSync(join(src, wasm), join(dest, 'stockfish-lite.wasm'));
console.log(`copy-engine: ${js} -> public/engine/stockfish-lite.{js,wasm}`);
