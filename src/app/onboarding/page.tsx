import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/features/onboarding/onboarding-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { db } from "@/lib/db";
import { listCountries } from "@/lib/i18n/countries";
import { listCurrencies } from "@/lib/i18n/currencies";
import { requireUser } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Welcome · Finance Tracker Pro" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const sessionUser = await requireUser();

  // If they've already onboarded, skip straight to the app.
  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: { onboardedAt: true },
  });
  if (user?.onboardedAt) redirect("/dashboard");

  const countries = listCountries();
  const currencies = listCurrencies();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-4">
        <span className="font-semibold">Finance Tracker Pro</span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold">Welcome! 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell us where you are so we can show amounts in your currency.
            </p>
          </div>
          <OnboardingForm countries={countries} currencies={currencies} />
        </div>
      </main>
    </div>
  );
}
