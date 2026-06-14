import { z } from "zod";

import { MAX_IMPORT_ROWS } from "@/lib/import/types";

const mappingSchema = z.object({
  date: z.number().int().min(0),
  description: z.number().int().min(0),
  amount: z.number().int().min(0),
  debit: z.number().int().min(-1),
  credit: z.number().int().min(-1),
});

const rowsSchema = z.array(z.array(z.string())).max(MAX_IMPORT_ROWS);

export const importPreviewSchema = z.object({
  accountId: z.string().uuid("Select an account"),
  rows: rowsSchema,
  mapping: mappingSchema,
  amountMode: z.enum(["SINGLE", "SPLIT"]),
  signConvention: z.enum(["NEGATIVE_EXPENSE", "POSITIVE_EXPENSE"]),
  dateFormat: z.enum(["AUTO", "DMY", "MDY", "YMD"]),
});

export const importCommitSchema = importPreviewSchema.extend({
  fileName: z.string().min(1).max(255),
  fileType: z.enum(["csv", "xlsx", "pdf"]).optional(),
  excluded: z.array(z.number().int()).optional().default([]),
});

export type ImportPreviewInput = z.infer<typeof importPreviewSchema>;
export type ImportCommitInput = z.infer<typeof importCommitSchema>;
