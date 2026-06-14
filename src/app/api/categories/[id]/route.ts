/**
 * PATCH  /api/categories/:id — update a category
 * DELETE /api/categories/:id — delete a category
 */
import { NextResponse } from "next/server";

import { categoryInputSchema } from "@/lib/validation/category";
import { getUserId, jsonError, mapServiceError, unauthorized } from "@/server/api/utils";
import {
  deleteCategory,
  updateCategory,
} from "@/server/services/category.service";

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

  const parsed = categoryInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid input", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const category = await updateCategory(userId, id, parsed.data);
    return NextResponse.json({ data: category });
  } catch (err) {
    return mapServiceError(err);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const { id } = await params;

  try {
    await deleteCategory(userId, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return mapServiceError(err);
  }
}
