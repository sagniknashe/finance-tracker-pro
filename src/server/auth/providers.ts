/**
 * Which OAuth providers are configured (have env credentials). Used by the
 * NextAuth config to register providers and by the auth pages to render only
 * the buttons that will actually work.
 */
import { env } from "@/lib/env";

export interface EnabledOAuth {
  google?: { id: string; secret: string };
  github?: { id: string; secret: string };
}

export function enabledOAuthProviders(): EnabledOAuth {
  const result: EnabledOAuth = {};
  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
    result.google = { id: env.AUTH_GOOGLE_ID, secret: env.AUTH_GOOGLE_SECRET };
  }
  if (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) {
    result.github = { id: env.AUTH_GITHUB_ID, secret: env.AUTH_GITHUB_SECRET };
  }
  return result;
}

/** Just the provider ids that are enabled (safe to expose to the client). */
export function enabledOAuthIds(): Array<"google" | "github"> {
  const e = enabledOAuthProviders();
  const ids: Array<"google" | "github"> = [];
  if (e.google) ids.push("google");
  if (e.github) ids.push("github");
  return ids;
}
