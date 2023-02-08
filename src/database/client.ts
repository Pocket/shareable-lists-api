import { PrismaClient } from '@prisma/client';

let prisma;

export function client(): PrismaClient {
  if (prisma) return prisma;

  // Always log errors
  const logOptions: any[] = ['error'];

  prisma = new PrismaClient({
    log: logOptions,
  });

  return prisma;
}
