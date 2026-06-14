import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/layout/sign-out-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/guards";

/**
 * Authenticated app shell. `requireUser()` enforces the session server-side
 * (defense-in-depth alongside the middleware) and provides the user for the
 * top bar. New users who haven't picked their country/currency are sent to
 * onboarding first. Feature pages render as children.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { onboardedAt: true },
  });
  if (!profile?.onboardedAt) redirect("/onboarding");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold">
            Finance Tracker Pro
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/transactions" className="hover:text-foreground">
              Transactions
            </Link>
            <Link href="/accounts" className="hover:text-foreground">
              Accounts
            </Link>
            <Link href="/budgets" className="hover:text-foreground">
              Budgets
            </Link>
            <Link href="/reports" className="hover:text-foreground">
              Reports
            </Link>
            <Link href="/import" className="hover:text-foreground">
              Import
            </Link>
            <Link href="/categories" className="hover:text-foreground">
              Categories
            </Link>
            <Link href="/rules" className="hover:text-foreground">
              Rules
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {user.email}
          </span>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
