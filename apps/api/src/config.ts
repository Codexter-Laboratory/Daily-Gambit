import { cpus } from 'node:os';
import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  /** The web app's origin, allowed by CORS. */
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  /** How deep Stockfish searches each position. Deeper is slower and a little more accurate. */
  ENGINE_DEPTH: z.coerce.number().int().min(6).max(24).default(12),
  /** Path to a native Stockfish binary. Without it the bundled WebAssembly build is run under Node. */
  STOCKFISH_PATH: z.string().optional(),
  /** Engine processes used for one job. Games are analysed in parallel across them. */
  ENGINES_PER_JOB: z.coerce.number().int().min(1).max(16).default(Math.max(1, Math.min(4, cpus().length))),
  /** Jobs the worker runs at the same time. */
  JOB_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(1),
  /** Trust X-Forwarded-For for the client address. Only enable behind a proxy you control, or clients can fake their address. */
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  /** New analysis jobs one client address may start per UTC day. */
  DAILY_JOB_LIMIT: z.coerce.number().int().min(1).default(40),
  /** Jobs allowed to wait in the queue. Beyond this the API answers 503 instead of piling up work. */
  MAX_QUEUED_JOBS: z.coerce.number().int().min(1).default(50),
  /** Run the queue worker inside the API process. Convenient locally; run `worker.ts` separately in production. */
  EMBED_WORKER: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

export type Config = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid configuration: ${problems}`);
  }
  const config = parsed.data;
  // Locally the worker runs inside the API unless told otherwise; in production it is a separate process.
  if (env.EMBED_WORKER === undefined) config.EMBED_WORKER = config.NODE_ENV !== 'production';
  return config;
}
