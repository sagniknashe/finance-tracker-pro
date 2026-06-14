/**
 * PATCH  /api/accounts/:id — update / archive an account
 * DELETE /api/accounts/:id — delete (only when it has no transactions)
 */
import { NextResponse } from "next/server";

import { accountInputSchema } from "@/lib/validation/account";
import { getUserId, jsonError, mapServiceError, unauthorized } from "@/server/api/utils";
import { deleteAccount, updateAccount } from "@/server/services/account.service";

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

  const parsed = accountInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid input", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const account = await updateAccount(userId, id, parsed.data);
    return NextResponse.json({ data: account });
  } catch (err) {
    return mapServiceError(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const { id } = await params;

  try {
    await deleteAccount(userId, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return mapServiceError(err);
  }
}
