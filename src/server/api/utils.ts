/** Shared helpers for route handlers: auth + consistent error responses. */
import { NextResponse } from "next/server";

import { auth } from "@/server/auth/auth";
import { NotFoundError, ServiceValidationError } from "@/server/services/errors";

/** Returns the authenticated user id, or null. */
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export const unauthorized = () =>
  jsonError("UNAUTHORIZED", "Authentication required", 401);

/** Map a thrown service error to an HTTP response. */
export function mapServiceError(err: unknown) {
  if (err instanceof NotFoundError) {
    return jsonError("NOT_FOUND", err.message, 404);
  }
  if (err instanceof ServiceValidationError) {
    return jsonError("VALIDATION_ERROR", err.message, 400, {
      field: err.field,
    });
  }
  console.error("Unhandled service error:", err);
  return jsonError("INTERNAL_ERROR", "Something went wrong", 500);
}
