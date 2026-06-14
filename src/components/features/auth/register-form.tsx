"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema } from "@/lib/validation/auth";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: (form.get("name") as string) || undefined,
      email: form.get("email"),
      password: form.get("password"),
      confirmPassword: form.get("confirmPassword"),
    };

    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setPending(true);
    try {
      // 1) Create the account via the registration API route.
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? "Registration failed");
        setPending(false);
        return;
      }

      // 2) Log the new user in immediately.
      const signInRes = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });

      if (!signInRes || signInRes.error) {
        // Account exists but auto-login failed — send them to the login page.
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" autoComplete="name" placeholder="Jane Doe" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground">
          At least 10 characters, including a letter and a number.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>

      <Button type="submit" isLoading={pending} className="w-full">
        Create account
      </Button>
    </form>
  );
}
