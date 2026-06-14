/**
 * PATCH  /api/rules/:id — update a rule
 * DELETE /api/rules/:id — delete a rule
 */
import { NextResponse } from "next/server";

import { ruleInputSchema } from "@/lib/validation/rule";
import { getUserId, jsonError, mapServiceError, unauthorized } from "@/server/api/utils";
import { deleteRule, updateRule } from "@/server/services/rule.service";

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

  const parsed = ruleInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid input", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const rule = await updateRule(userId, id, parsed.data);
    return NextResponse.json({ data: rule });
  } catch (err) {
    return mapServiceError(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const { id } = await params;

  try {
    await deleteRule(userId, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return mapServiceError(err);
  }
}
