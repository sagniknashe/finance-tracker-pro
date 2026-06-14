/**
 * POST /api/auth/register
 *
 * Creates a credentials account. Returns 201 with the new user's public fields.
 * Login is performed separately by the client via Auth.js (`signIn`) after a
 * successful registration, so this route never sets a session itself.
 */
import { NextResponse } from "next/server";

import { registerSchema } from "@/lib/validation/auth";
import { clientIp, rateLimit } from "@/lib/utils/rate-limit";
import { createUser, EmailInUseError } from "@/server/services/user.service";

// argon2 is a native module — force the Node.js runtime.
export const runtime = "nodejs";

export async function POST(request: Request) {
  // Throttle: 10 registrations per IP per hour.
  const ip = clientIp(request.headers);
  const limit = rateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many attempts. Try again later." } },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  try {
    const user = await createUser({ name, email, password });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (err) {
    if (err instanceof EmailInUseError) {
      return NextResponse.json(
        { error: { code: "EMAIL_IN_USE", message: err.message } },
        { status: 409 },
      );
    }
    console.error("Registration failed:", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 },
    );
  }
}
