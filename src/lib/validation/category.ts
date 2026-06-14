import { z } from "zod";

export const categoryTypeSchema = z.enum(["INCOME", "EXPENSE"]);

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Name is too long"),
  type: categoryTypeSchema,
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Enter a valid hex color, e.g. #16A34A"),
  icon: z.string().trim().max(40).nullish(),
  parentId: z.string().uuid().nullish(),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
