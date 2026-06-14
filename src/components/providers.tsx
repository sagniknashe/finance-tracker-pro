"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

/**
 * Client providers mounted once at the root:
 *   - SessionProvider: exposes `useSession()` to client components.
 *   - ThemeProvider (next-themes): dark mode via the `class` strategy on <html>.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
