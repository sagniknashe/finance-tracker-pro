/**
 * GET /api/dashboard
 *
 * Returns the full dashboard read model for the authenticated user. The
 * dashboard page itself reads the service directly (RSC); this endpoint exists
 * for client-side refresh and parity with the API surface.
 */
import { NextResponse } from "next/server";

import { auth } from "@/server/auth/auth";
import { getDashboardData } from "@/server/services/dashboard.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // always reflect latest data

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 },
    );
  }

  const data = await getDashboardData(session.user.id);
  return NextResponse.json({ data });
}
