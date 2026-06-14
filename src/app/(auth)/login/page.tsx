import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/features/auth/login-form";
import { OAuthButtons } from "@/components/features/auth/oauth-buttons";
import { getCurrentUser } from "@/server/auth/guards";
import { enabledOAuthIds } from "@/server/auth/providers";

export const metadata: Metadata = { title: "Sign in · Finance Tracker Pro" };

export default async function LoginPage() {
  // Already signed in? Skip the form.
  if (await getCurrentUser()) redirect("/dashboard");

  const oauthProviders = enabledOAuthIds();

  return (
    <div className="grid gap-6">
      <div className="grid gap-1 text-center">
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>

      {/* useSearchParams in LoginForm requires a Suspense boundary. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>

      {oauthProviders.length > 0 && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <OAuthButtons providers={oauthProviders} />
        </>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
