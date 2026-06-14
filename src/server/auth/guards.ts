/**
 * Server-side session helpers for Server Components, Server Actions and route
 * handlers. The middleware is the first line of defense for protected routes;
 * these provide defense-in-depth and a typed `user` where you need the id.
 */
import { redirect } from "next/navigation";

import { auth } from "@/server/auth/auth";

/** Returns the current session (or null). Thin wrapper around `auth()`. */
export const getSession = () => auth();

/** Returns the current user or null — for optional-auth contexts. */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Requires an authenticated user. Redirects to /login when absent.
 * Use at the top of protected Server Components / layouts.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}
