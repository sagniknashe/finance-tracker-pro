/**
 * Full Auth.js (NextAuth v5) setup — Node runtime.
 *
 * Uses the JWT session strategy (required by the Credentials provider) and does
 * NOT use the Prisma adapter: the adapter expects models literally named
 * `Account`/`Session`, which collides with our financial `Account` model. Since
 * we run JWT sessions and don't need provider-token storage, we persist OAuth
 * users ourselves in the `signIn` callback (linking by email) and resolve our
 * own user id into the token in the `jwt` callback.
 *
 * Exposes the standard v5 surface: `auth`, `handlers`, `signIn`, `signOut`.
 */
import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { z } from "zod";

import { db } from "@/lib/db";
import { authConfig } from "@/server/auth/auth.config";
import { verifyPassword } from "@/server/auth/password";
import { enabledOAuthProviders } from "@/server/auth/providers";
import { ensureOAuthUser } from "@/server/services/user.service";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const enabled = enabledOAuthProviders();
const oauthProviders: Provider[] = [];
if (enabled.google) {
  oauthProviders.push(
    Google({
      clientId: enabled.google.id,
      clientSecret: enabled.google.secret,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}
if (enabled.github) {
  oauthProviders.push(
    GitHub({
      clientId: enabled.github.id,
      clientSecret: enabled.github.secret,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...oauthProviders,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });

        // No user, or an OAuth-only account with no password set.
        if (!user?.passwordHash) return null;

        const valid = await verifyPassword(user.passwordHash, password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Create/link the user row for OAuth sign-ins (no adapter does this for us).
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") return true;
      if (!user.email) return false;
      await ensureOAuthUser({
        email: user.email,
        name: user.name,
        image: user.image,
      });
      return true;
    },
    // Put OUR user id on the token (provider profiles carry the provider's id).
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "credentials") {
          token.sub = user.id;
        } else if (user.email) {
          const dbUser = await db.user.findUnique({
            where: { email: user.email },
            select: { id: true },
          });
          if (dbUser) token.sub = dbUser.id;
        }
      }
      return token;
    },
  },
});

// Re-export password helpers for convenience.
export { hashPassword, verifyPassword } from "@/server/auth/password";
