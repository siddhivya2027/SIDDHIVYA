import "server-only";
import { PrismaClient } from "@prisma/client";

/** One Prisma client per server instance. `hasDb()` is false until the Neon database is connected in Vercel. */
export const hasDb = () => !!process.env.DATABASE_URL;

const g = globalThis as unknown as { __prisma?: PrismaClient };
export function db(): PrismaClient {
  if (!hasDb()) throw new Error("Database not connected. Connect Neon in Vercel → Storage.");
  if (!process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL;
  if (!g.__prisma) g.__prisma = new PrismaClient();
  return g.__prisma;
}

export async function audit(actor: string, action: string, target: string) {
  try { await db().auditLog.create({ data: { actor, action, target: target.slice(0, 300) } }); } catch { /* never block the request */ }
}
