/**
 * Validated, type-safe environment access.
 *
 * Import `env` anywhere instead of reading `process.env` directly. Validation
 * runs once at module load and fails fast (with a readable error) if a required
 * variable is missing or malformed — so misconfiguration is caught at boot,
 * not at the first request that happens to need the value.
 */
import { z } from "zod";

const booleanish = z
  .enum(["true", "false"])
  .transform((v) => v === "true");

const schema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Auth.js
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: booleanish.optional().default("true"),

  // OAuth (optional)
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),

  // Email (optional)
  EMAIL_SERVER_HOST: z.string().optional(),
  EMAIL_SERVER_PORT: z.coerce.number().int().positive().optional(),
  EMAIL_SERVER_USER: z.string().optional(),
  EMAIL_SERVER_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
  );
  throw new Error("Invalid environment variables. See logs above.");
}

export const env = parsed.data;
export type Env = typeof env;
