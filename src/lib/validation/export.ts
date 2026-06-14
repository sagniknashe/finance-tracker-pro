import { z } from "zod";

export const exportQuerySchema = z.object({
  type: z.enum(["transactions", "budgets", "monthly"]),
  format: z.enum(["csv", "xlsx", "pdf"]),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  month: z.coerce.date().optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  txnType: z.enum(["INCOME", "EXPENSE"]).optional(),
  search: z.string().max(200).optional(),
});

export type ExportQuery = z.infer<typeof exportQuerySchema>;
