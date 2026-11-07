import { PrismaClient } from '../generated/client/index.js';

export { Prisma, PrismaClient } from '../generated/client/index.js';

export function createPrisma(databaseUrl: string): PrismaClient {
  return new PrismaClient({ datasourceUrl: databaseUrl });
}
