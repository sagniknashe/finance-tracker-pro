/**
 * POST /api/import/preview — dry-run: normalize, validate, dedupe. No writes.
 */
import { NextResponse } from "next/server";

import { importPreviewSchema } from "@/lib/validation/import";
import { getUserId, jsonError, mapServiceError, unauthorized } from "@/server/api/utils";
import { previewImport } from "@/server/services/import.service";

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

  const parsed = importPreviewSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid input", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const result = await previewImport(userId, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    return mapServiceError(err);
  }
}
