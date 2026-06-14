/**
 * POST /api/onboarding — save the user's country + currency and mark onboarding
 * complete. The locale is derived from the country so money formatting follows
 * their region.
 */
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { localeForCountry } from "@/lib/i18n/countries";
import { onboardingSchema } from "@/lib/validation/onboarding";
import { getUserId, jsonError, unauthorized } from "@/server/api/utils";

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

  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", "Invalid input", 400, {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }

  const { country, currency } = parsed.data;
  await db.user.update({
    where: { id: userId },
    data: {
      country,
      baseCurrency: currency,
      locale: localeForCountry(country),
      onboardedAt: new Date(),
    },
  });

  return NextResponse.json({ data: { ok: true } });
}
