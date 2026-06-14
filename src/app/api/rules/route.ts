/**
 * GET  /api/rules — list categorization rules
 * POST /api/rules — create a rule
 */
import { NextResponse } from "next/server";

import { ruleInputSchema } from "@/lib/validation/rule";
import { getUserId, jsonError, mapServiceError, unauthorized } from "@/server/api/utils";
import { createRule, listRules } from "@/server/services/rule.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const data = await listRules(userId);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON body", 400);
  }

  const parsed = ruleInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid input", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const rule = await createRule(userId, parsed.data);
    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (err) {
    return mapServiceError(err);
  }
}
