/**
 * PrismaClient singleton for Next.js.
 *
 * ARCHITECTURE: In development, Next.js hot-reloads modules on every change.
 * Without a singleton, each reload would create a new PrismaClient instance,
 * eventually exhausting the database connection pool.
 *
 * This pattern stores the client on `globalThis` (which persists across
 * hot reloads) and only creates a new instance if one doesn't exist.
 *
 * In production, module-level variables persist for the process lifetime,
 * so the globalThis trick is harmless but unnecessary.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}