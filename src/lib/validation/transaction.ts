/**
 * Transaction validation. Shared by the API routes and the UI form.
 *
 * `amount` is accepted as a MAJOR-unit number (e.g. 12.34); the service
 * converts it to integer minor units. This module covers INCOME/EXPENSE only —
 * transfers are handled by a separate flow.
 */
import { z } from "zod";

export const transactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);

export const transactionInputSchema = z.object({
  type: transactionTypeSchema,
  // Accept an ISO date string or Date; normalize to a Date.
  date: z.coerce.date({ message: "A valid date is required" }),
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than 0")
    .max(1_000_000_000, "Amount is too large"),
  accountId: z.string().uuid("Select an account"),
  categoryId: z.string().uuid().nullish(),
  description: z.string().trim().max(200, "Description is too long").optional().default(""),
  notes: z.string().trim().max(1000, "Notes are too long").nullish(),
});

// Edit sends the full object (PUT-style), so it reuses the same schema.
export const updateTransactionSchema = transactionInputSchema;

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: transactionTypeSchema.optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type TransactionInput = z.infer<typeof transactionInputSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
