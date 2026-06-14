/**
 * GET  /api/categories — list the user's categories
 * POST /api/categories — create a category
 */
import { NextResponse } from "next/server";

import { categoryInputSchema } from "@/lib/validation/category";
import { getUserId, jsonError, mapServiceError, unauthorized } from "@/server/api/utils";
import {
  createCategory,
  listCategories,
} from "@/server/services/category.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const data = await listCategories(userId);
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

  const parsed = categoryInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid input", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const category = await createCategory(userId, parsed.data);
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (err) {
    return mapServiceError(err);
  }
}
