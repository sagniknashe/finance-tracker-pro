/**
 * POST /api/import/parse — multipart upload → parsed grid.
 *
 * Accepts a CSV / XLSX / PDF file, returns columns + rows + a suggested column
 * mapping. No data is persisted at this step.
 */
import { NextResponse } from "next/server";

import { detectFileType, parseFile } from "@/lib/import/parse";
import { MAX_FILE_BYTES } from "@/lib/import/types";
import { getUserId, jsonError, unauthorized } from "@/server/api/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("BAD_REQUEST", "Expected multipart form data", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("BAD_REQUEST", "No file provided", 400);
  }
  if (file.size > MAX_FILE_BYTES) {
    return jsonError("FILE_TOO_LARGE", "File exceeds the 10 MB limit", 400);
  }

  const fileType = detectFileType(file.name);
  if (!fileType) {
    return jsonError(
      "UNSUPPORTED_TYPE",
      "Unsupported file type. Upload a CSV, XLSX or PDF.",
      400,
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const grid = await parseFile(buffer, file.name, fileType);
    if (grid.rowCount === 0) {
      return jsonError(
        "EMPTY_FILE",
        "No rows could be read from this file.",
        400,
      );
    }
    return NextResponse.json({ data: grid });
  } catch (err) {
    console.error("Parse failed:", err);
    return jsonError("PARSE_ERROR", "Could not parse this file", 400);
  }
}
