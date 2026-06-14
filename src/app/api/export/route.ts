/**
 * GET /api/export?type=…&format=…&<filters>
 *
 * Streams a generated CSV / XLSX / PDF download for transactions, budgets, or
 * the monthly summary. The browser downloads it (Content-Disposition).
 */
import { NextResponse } from "next/server";

import { exportQuerySchema } from "@/lib/validation/export";
import { getUserId, jsonError, mapServiceError, unauthorized } from "@/server/api/utils";
import { buildExport } from "@/server/services/export.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = exportQuerySchema.safeParse(params);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid export request", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const { buffer, contentType, filename } = await buildExport(
      userId,
      parsed.data,
    );
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return mapServiceError(err);
  }
}
