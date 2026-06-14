import { z } from "zod";

export const ruleInputSchema = z.object({
  categoryId: z.string().uuid("Select a category"),
  field: z.enum(["DESCRIPTION", "AMOUNT", "ACCOUNT"]).default("DESCRIPTION"),
  operator: z.enum([
    "CONTAINS",
    "EQUALS",
    "STARTS_WITH",
    "ENDS_WITH",
    "REGEX",
    "GT",
    "LT",
  ]),
  value: z.string().trim().min(1, "Enter a value").max(200, "Value is too long"),
  priority: z.number().int().min(0).max(100000).default(100),
  isActive: z.boolean().default(true),
});

export const ruleApplySchema = z.object({
  dryRun: z.boolean().optional().default(false),
});

export type RuleInput = z.infer<typeof ruleInputSchema>;
