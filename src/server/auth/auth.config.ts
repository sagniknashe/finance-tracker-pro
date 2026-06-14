/**
 * Edge-safe Auth.js configuration.
 *
 * This object is imported by `middleware.ts`, which runs on the Edge runtime
 * where Prisma and the native `argon2` module are unavailable. It therefore
 * contains ONLY what the middleware needs: session strategy, page routes, and
 * the `authorized` callback that gates protected routes. The Prisma adapter and
 * the Credentials provider (which hit the DB) are added in `auth.ts`, which runs
 * on the Node runtime.
 */
import type { NextAuthConfig } from "next-auth";

// Routes that do NOT require authentication.
const PUBLIC_PREFIXES = ["/login", "/register", "/reset-password", "/verify-email"];

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  // OAuth providers are listed here (they are edge-safe). Credentials is added
  // in auth.ts because it needs database + password hashing.
  providers: [],
  callbacks: {
    /**
     * Gate access. Returning false/redirect sends unauthenticated users to the
     * sign-in page; returning true allows the request through.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isPublic =
        pathname === "/" ||
        PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

      // Signed-in users hitting an auth page get bounced to the dashboard.
      if (isLoggedIn && isPublic && pathname !== "/") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      if (isPublic) return true;
      return isLoggedIn;
    },
    // Persist the user id onto the token and expose it on the session.
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
