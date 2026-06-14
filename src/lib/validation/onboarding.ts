import { z } from "zod";

export const onboardingSchema = z.object({
  country: z
    .string()
    .regex(/^[A-Za-z]{2}$/, "Select a country")
    .transform((s) => s.toUpperCase()),
  currency: z
    .string()
    .regex(/^[A-Za-z]{3}$/, "Select a currency")
    .transform((s) => s.toUpperCase()),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
