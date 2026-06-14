/**
 * Prisma client singleton.
 *
 * In development Next.js hot-reloads modules, which would otherwise spawn a new
 * PrismaClient (and a new connection pool) on every reload and exhaust the
 * database connection limit. We cache the instance on `globalThis` to reuse it
 * across reloads. In production a fresh instance is created once per process.
 */
import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";

const createPrismaClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
