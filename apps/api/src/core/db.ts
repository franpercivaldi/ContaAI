import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Opcional: pequeño helper para comprobar conexión
export async function dbPing() {
  // En Postgres, un SELECT 1 es suficiente
  const r = await prisma.$queryRawUnsafe('SELECT 1 AS ok');
  return r;
}
