import { z } from "zod";

export const budgetCreateSchema = z.object({
  categoryId: z.string().uuid("Select a category"),
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than 0")
    .max(1_000_000_000, "Amount is too large"),
  // Any day in the target month; the service normalizes to the 1st.
  month: z.coerce.date({ message: "A valid month is required" }),
  alertThreshold: z.number().int().min(1).max(100).default(80),
});

export const budgetUpdateSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0").max(1_000_000_000),
  alertThreshold: z.number().int().min(1).max(100),
});

export const budgetListQuerySchema = z.object({
  month: z.coerce.date().optional(),
});

export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;
export type BudgetUpdateInput = z.infer<typeof budgetUpdateSchema>;
