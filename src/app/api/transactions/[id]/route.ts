/**
 * GET    /api/transactions/:id  — fetch one
 * PATCH  /api/transactions/:id  — update (full payload)
 * DELETE /api/transactions/:id  — delete
 */
import { NextResponse } from "next/server";

import { updateTransactionSchema } from "@/lib/validation/transaction";
import { getUserId, jsonError, mapServiceError, unauthorized } from "@/server/api/utils";
import {
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from "@/server/services/transaction.service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const { id } = await params;

  try {
    const tx = await getTransaction(userId, id);
    return NextResponse.json({ data: tx });
  } catch (err) {
    return mapServiceError(err);
  }
}

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

  const parsed = updateTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid input", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const tx = await updateTransaction(userId, id, parsed.data);
    return NextResponse.json({ data: tx });
  } catch (err) {
    return mapServiceError(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const { id } = await params;

  try {
    await deleteTransaction(userId, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return mapServiceError(err);
  }
}
