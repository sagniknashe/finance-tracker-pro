/**
 * Auth.js catch-all route handler.
 *
 * Mounts the GET/POST handlers that power sign-in, sign-out, OAuth callbacks,
 * CSRF, and session endpoints under /api/auth/*. This is wiring, not a page.
 */
import { handlers } from "@/server/auth/auth";

export const { GET, POST } = handlers;
