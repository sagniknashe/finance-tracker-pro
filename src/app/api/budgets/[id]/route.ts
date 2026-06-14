/**
 * PATCH  /api/budgets/:id — update amount / alert threshold
 * DELETE /api/budgets/:id — delete a budget
 */
import { NextResponse } from "next/server";

import { budgetUpdateSchema } from "@/lib/validation/budget";
import { getUserId, jsonError, mapServiceError, unauthorized } from "@/server/api/utils";
import { deleteBudget, updateBudget } from "@/server/services/budget.service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON body", 400);
  }

  const parsed = budgetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid input", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const budget = await updateBudget(userId, id, parsed.data);
    return NextResponse.json({ data: budget });
  } catch (err) {
    return mapServiceError(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const { id } = await params;

  try {
    await deleteBudget(userId, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return mapServiceError(err);
  }
}
