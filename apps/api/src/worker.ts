import { createPrisma } from './db.js';
import { loadConfig } from './config.js';
import { startAnalysisWorker } from './queue/worker.js';

// A standalone worker: run this process (and as many copies as you need) next to the API.
const config = loadConfig();
const prisma = createPrisma(config.DATABASE_URL);
const worker = startAnalysisWorker(config, prisma, (m) => console.error(m));
console.log(`Analysis worker ready (${config.JOB_CONCURRENCY} jobs at a time, ${config.ENGINES_PER_JOB} engines per job, depth ${config.ENGINE_DEPTH})`);

let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`${signal} received, finishing up`);
  await worker.close(); // waits for running jobs
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
