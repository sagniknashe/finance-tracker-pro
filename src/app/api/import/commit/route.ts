/**
 * POST /api/import/commit — persist the approved rows + an import-history record.
 */
import { NextResponse } from "next/server";

import { importCommitSchema } from "@/lib/validation/import";
import { getUserId, jsonError, mapServiceError, unauthorized } from "@/server/api/utils";
import { commitImport } from "@/server/services/import.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("BAD_REQUEST", "Invalid JSON body", 400);
  }

  const parsed = importCommitSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid input", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const result = await commitImport(userId, parsed.data);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    return mapServiceError(err);
  }
}
