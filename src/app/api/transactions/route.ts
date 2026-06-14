/**
 * GET  /api/transactions  — paginated, filtered list (+ totals)
 * POST /api/transactions  — create a transaction
 */
import { NextResponse } from "next/server";

import { listQuerySchema, transactionInputSchema } from "@/lib/validation/transaction";
import { getUserId, jsonError, mapServiceError, unauthorized } from "@/server/api/utils";
import {
  createTransaction,
  listTransactions,
} from "@/server/services/transaction.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = listQuerySchema.safeParse(params);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid query", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const result = await listTransactions(userId, parsed.data);
  return NextResponse.json(result);
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

  const parsed = transactionInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid input", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const tx = await createTransaction(userId, parsed.data);
    return NextResponse.json({ data: tx }, { status: 201 });
  } catch (err) {
    return mapServiceError(err);
  }
}
