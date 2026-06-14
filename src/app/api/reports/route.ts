/**
 * GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns all four reports for the given range. Defaults to the last 6 months
 * (start of the month 5 months ago → today) when the range is omitted.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import { addMonthsUTC, startOfMonthUTC } from "@/lib/utils/dates";
import { getUserId, jsonError, unauthorized } from "@/server/api/utils";
import { getReports } from "@/server/services/reports.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid range", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const to = parsed.data.to ?? new Date();
  const from = parsed.data.from ?? startOfMonthUTC(addMonthsUTC(to, -5));

  const data = await getReports(userId, from, to);
  return NextResponse.json(data);
}
