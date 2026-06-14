/**
 * GET /api/import/history — recent import batches for the user.
 */
import { NextResponse } from "next/server";

import { getUserId, unauthorized } from "@/server/api/utils";
import { listImportHistory } from "@/server/services/import.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const data = await listImportHistory(userId);
  return NextResponse.json({ data });
}
