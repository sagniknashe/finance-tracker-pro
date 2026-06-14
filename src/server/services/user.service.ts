/**
 * User domain service.
 *
 * Owns user creation (password hashing + default-category provisioning) so the
 * logic lives in one testable place rather than inside a route handler.
 */
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import { hashPassword } from "@/server/auth/password";

/** Thrown when attempting to register an email that already exists. */
export class EmailInUseError extends Error {
  constructor() {
    super("An account with this email already exists");
    this.name = "EmailInUseError";
  }
}

export interface CreateUserInput {
  name?: string;
  email: string;
  password: string;
}

/**
 * Create a credentials user and seed their default categories in a single
 * transaction (nested create). The unique constraint on `email` is the source
 * of truth for duplicates — we translate the Prisma P2002 error into a clean
 * domain error rather than relying on a check-then-insert race.
 */
export async function createUser(input: CreateUserInput) {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await db.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        categories: {
          create: DEFAULT_CATEGORIES.map((c) => ({
            name: c.name,
            type: c.type,
            color: c.color,
            icon: c.icon,
            isSystem: true,
          })),
        },
      },
      select: { id: true, email: true, name: true },
    });
    return user;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new EmailInUseError();
    }
    throw err;
  }
}

export function getUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } });
}

export interface OAuthUserInput {
  email: string;
  name?: string | null;
  image?: string | null;
}

/**
 * Ensure a user row exists for an OAuth (Google/GitHub) sign-in. Links by email:
 * if the email already exists (e.g. they registered with a password first), we
 * reuse it; otherwise we create a verified user and seed default categories.
 * Returns the user's id so the JWT can carry our own id, not the provider's.
 */
export async function ensureOAuthUser(input: OAuthUserInput): Promise<string> {
  const existing = await db.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) return existing.id;

  const user = await db.user.create({
    data: {
      email: input.email,
      name: input.name ?? null,
      image: input.image ?? null,
      emailVerified: new Date(), // OAuth providers verify email
      categories: {
        create: DEFAULT_CATEGORIES.map((c) => ({
          name: c.name,
          type: c.type,
          color: c.color,
          icon: c.icon,
          isSystem: true,
        })),
      },
    },
    select: { id: true },
  });
  return user.id;
}
