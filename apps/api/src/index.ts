import { createDeps } from './bootstrap.js';
import { loadConfig } from './config.js';
import { startAnalysisWorker } from './queue/worker.js';
import { buildServer } from './server.js';

const config = loadConfig();
const deps = createDeps(config);
const app = await buildServer(deps);
const worker = config.EMBED_WORKER ? startAnalysisWorker(config, deps.prisma, (m) => app.log.warn(m)) : null;

await app.listen({ port: config.PORT, host: config.HOST });
app.log.info(`API ready on :${config.PORT} (worker ${worker ? 'embedded' : 'separate'}, ${config.ENGINES_PER_JOB} engines per job, depth ${config.ENGINE_DEPTH})`);

let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  app.log.info(`${signal} received, shutting down`);
  await app.close();
  await worker?.close();
  await deps.close();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
