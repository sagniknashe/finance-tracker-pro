"use client";

import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

/**
 * OAuth sign-in buttons. Only providers passed in `providers` (i.e. configured
 * with env credentials on the server) are rendered, so users never see a button
 * that can't work.
 */
export function OAuthButtons({
  providers,
}: {
  providers: Array<"google" | "github">;
}) {
  if (providers.length === 0) return null;

  return (
    <div className="grid gap-2">
      {providers.includes("google") && (
        <Button
          type="button"
          variant="outline"
          onClick={() => signIn("google", { redirectTo: "/dashboard" })}
        >
          Continue with Google
        </Button>
      )}
      {providers.includes("github") && (
        <Button
          type="button"
          variant="outline"
          onClick={() => signIn("github", { redirectTo: "/dashboard" })}
        >
          Continue with GitHub
        </Button>
      )}
    </div>
  );
}
