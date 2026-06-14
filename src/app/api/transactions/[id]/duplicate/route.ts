/**
 * POST /api/transactions/:id/duplicate — create a copy of a transaction.
 */
import { NextResponse } from "next/server";

import { getUserId, mapServiceError, unauthorized } from "@/server/api/utils";
import { duplicateTransaction } from "@/server/services/transaction.service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const { id } = await params;

  try {
    const tx = await duplicateTransaction(userId, id);
    return NextResponse.json({ data: tx }, { status: 201 });
  } catch (err) {
    return mapServiceError(err);
  }
}
