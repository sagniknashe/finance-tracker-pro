/**
 * GET  /api/accounts — list the user's accounts (with derived balances)
 * POST /api/accounts — create an account
 */
import { NextResponse } from "next/server";

import { accountInputSchema } from "@/lib/validation/account";
import { getUserId, jsonError, mapServiceError, unauthorized } from "@/server/api/utils";
import { createAccount, listAccounts } from "@/server/services/account.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const includeArchived =
    new URL(request.url).searchParams.get("includeArchived") !== "false";
  const data = await listAccounts(userId, includeArchived);
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

  const parsed = accountInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid input", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const account = await createAccount(userId, parsed.data);
    return NextResponse.json({ data: account }, { status: 201 });
  } catch (err) {
    return mapServiceError(err);
  }
}
