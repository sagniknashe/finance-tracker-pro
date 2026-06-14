/**
 * Password hashing — single source of truth.
 *
 * Argon2id is the recommended algorithm for password storage. Kept in its own
 * module (no Auth.js / Prisma imports) so it can be used from services and
 * tests without pulling in the full auth graph. Node runtime only.
 */
import argon2 from "argon2";

export const hashPassword = (plain: string) =>
  argon2.hash(plain, { type: argon2.argon2id });

export const verifyPassword = (hash: string, plain: string) =>
  argon2.verify(hash, plain);
