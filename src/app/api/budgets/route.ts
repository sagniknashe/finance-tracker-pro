/**
 * GET  /api/budgets?month=YYYY-MM — budgets + consumption for a month
 * POST /api/budgets               — create a monthly budget
 */
import { NextResponse } from "next/server";

import { budgetCreateSchema, budgetListQuerySchema } from "@/lib/validation/budget";
import { getUserId, jsonError, mapServiceError, unauthorized } from "@/server/api/utils";
import { createBudget, listBudgets } from "@/server/services/budget.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = budgetListQuerySchema.safeParse(params);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid query", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const month = parsed.data.month ?? new Date();
  const overview = await listBudgets(userId, month);
  return NextResponse.json({ ...overview, month: month.toISOString() });
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

  const parsed = budgetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid input", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const budget = await createBudget(userId, parsed.data);
    return NextResponse.json({ data: budget }, { status: 201 });
  } catch (err) {
    return mapServiceError(err);
  }
}
