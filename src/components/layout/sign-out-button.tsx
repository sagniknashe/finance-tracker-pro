"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import * as React from "react";

import { Button } from "@/components/ui/button";

/** Logout control. Clears the session via Auth.js and returns to /login. */
export function SignOutButton() {
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      isLoading={pending}
      onClick={() => {
        setPending(true);
        void signOut({ redirectTo: "/login" });
      }}
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Sign out
    </Button>
  );
}
