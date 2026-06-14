/**
 * POST /api/rules/seed — create the example starter rules
 * (SWIGGY/ZOMATO → Food, AMAZON → Shopping, PETROL → Fuel), creating the
 * referenced expense categories if they don't exist.
 */
import { NextResponse } from "next/server";

import { getUserId, mapServiceError, unauthorized } from "@/server/api/utils";
import { seedStarterRules } from "@/server/services/rule.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  try {
    const result = await seedStarterRules(userId);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    return mapServiceError(err);
  }
}
