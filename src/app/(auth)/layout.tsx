import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";

/** Centered shell for the auth pages (login / register / reset). */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-4">
        <Link href="/" className="font-semibold">
          Finance Tracker Pro
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
          {children}
        </div>
      </main>
    </div>
  );
}
