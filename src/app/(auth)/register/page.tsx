import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OAuthButtons } from "@/components/features/auth/oauth-buttons";
import { RegisterForm } from "@/components/features/auth/register-form";
import { getCurrentUser } from "@/server/auth/guards";
import { enabledOAuthIds } from "@/server/auth/providers";

export const metadata: Metadata = { title: "Sign up · Finance Tracker Pro" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  const oauthProviders = enabledOAuthIds();

  return (
    <div className="grid gap-6">
      <div className="grid gap-1 text-center">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Start tracking your finances in minutes
        </p>
      </div>

      <RegisterForm />

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
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
