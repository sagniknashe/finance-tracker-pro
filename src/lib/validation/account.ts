import { z } from "zod";

export const accountTypeSchema = z.enum([
  "CHECKING",
  "SAVINGS",
  "CREDIT_CARD",
  "CASH",
  "INVESTMENT",
]);

export const accountInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  type: accountTypeSchema,
  // Major units; may be negative (e.g. a credit card balance owed).
  openingBalance: z
    .number()
    .min(-1_000_000_000)
    .max(1_000_000_000)
    .default(0),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Use a 3-letter currency code")
    .transform((s) => s.toUpperCase())
    .default("USD"),
  isArchived: z.boolean().optional(),
});

export type AccountInput = z.infer<typeof accountInputSchema>;
