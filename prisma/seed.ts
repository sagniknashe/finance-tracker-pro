/**
 * Database seed.
 *
 * Run with: `npm run db:seed` (or automatically after `prisma migrate reset`).
 *
 * Categories are per-user, so the canonical template (DEFAULT_CATEGORIES) is
 * copied into each new user's account at registration time (see
 * src/server/services/user.service.ts). This script just reports the template
 * and is a place to add demo data for non-production environments.
 */
import { PrismaClient } from "@prisma/client";

import { DEFAULT_CATEGORIES } from "../src/lib/default-categories";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.log("Skipping demo seed in production.");
    return;
  }
  console.log(
    `Default category template contains ${DEFAULT_CATEGORIES.length} categories.`,
  );
  console.log("Seed complete. (Per-user categories are provisioned at registration.)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
