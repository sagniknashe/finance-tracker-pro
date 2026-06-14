/**
 * Route protection middleware.
 *
 * Uses the edge-safe `authConfig` (no Prisma / no argon2) to evaluate the
 * `authorized` callback on every matched request. Unauthenticated access to a
 * protected route is redirected to /login.
 */
import NextAuth from "next-auth";

import { authConfig } from "@/server/auth/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on all routes except Next internals, the auth API, and static assets.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
