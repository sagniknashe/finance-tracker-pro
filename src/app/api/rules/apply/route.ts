/**
 * POST /api/rules/apply — apply active rules to uncategorized transactions.
 * Body: { dryRun?: boolean }. dryRun reports how many would match without
 * writing.
 */
import { NextResponse } from "next/server";

import { ruleApplySchema } from "@/lib/validation/rule";
import { getUserId, jsonError, mapServiceError, unauthorized } from "@/server/api/utils";
import { applyRulesToTransactions } from "@/server/services/rule.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const parsed = ruleApplySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid input", 400);
  }

  try {
    const result = await applyRulesToTransactions(userId, parsed.data.dryRun);
    return NextResponse.json({ data: result });
  } catch (err) {
    return mapServiceError(err);
  }
}
