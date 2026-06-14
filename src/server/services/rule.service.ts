/**
 * Categorization rule service: CRUD, starter rules, and bulk application.
 *
 * The engine itself lives in lib/rules/engine.ts; this service is the DB-bound
 * layer that loads rules (with category metadata), validates field/operator
 * combinations, and applies matches to transactions.
 */
import { Prisma, type CategoryType, type RuleField, type RuleOperator } from "@prisma/client";

import { db } from "@/lib/db";
import { findMatchingRule } from "@/lib/rules/engine";
import type { RuleInput } from "@/lib/validation/rule";
import { NotFoundError, ServiceValidationError } from "@/server/services/errors";

export interface RuleDTO {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryType: CategoryType;
  field: RuleField;
  operator: RuleOperator;
  value: string;
  priority: number;
  isActive: boolean;
}

/** Rule shape used by the engine + import (includes category metadata). */
export interface ActiveRule {
  id: string;
  field: RuleField;
  operator: RuleOperator;
  value: string;
  categoryId: string;
  categoryType: CategoryType;
  categoryName: string;
  categoryColor: string;
}

const STRING_OPERATORS: RuleOperator[] = [
  "CONTAINS",
  "EQUALS",
  "STARTS_WITH",
  "ENDS_WITH",
  "REGEX",
];
const AMOUNT_OPERATORS: RuleOperator[] = ["GT", "LT", "EQUALS"];

const ruleInclude = {
  category: { select: { name: true, color: true, type: true } },
} satisfies Prisma.CategorizationRuleInclude;

type RuleRow = Prisma.CategorizationRuleGetPayload<{ include: typeof ruleInclude }>;

function toDTO(r: RuleRow): RuleDTO {
  return {
    id: r.id,
    categoryId: r.categoryId,
    categoryName: r.category.name,
    categoryColor: r.category.color,
    categoryType: r.category.type,
    field: r.field,
    operator: r.operator,
    value: r.value,
    priority: r.priority,
    isActive: r.isActive,
  };
}

/** Validate the field/operator/value combination. */
function validateRule(input: RuleInput): void {
  if (input.field === "AMOUNT") {
    if (!AMOUNT_OPERATORS.includes(input.operator)) {
      throw new ServiceValidationError(
        "Amount rules support greater than, less than, or equals",
        "operator",
      );
    }
    if (Number.isNaN(Number.parseFloat(input.value))) {
      throw new ServiceValidationError("Amount value must be a number", "value");
    }
  } else {
    // DESCRIPTION / ACCOUNT are text fields.
    if (!STRING_OPERATORS.includes(input.operator)) {
      throw new ServiceValidationError(
        "This field does not support that operator",
        "operator",
      );
    }
    if (input.operator === "REGEX") {
      try {
        new RegExp(input.value);
      } catch {
        throw new ServiceValidationError("Invalid regular expression", "value");
      }
    }
  }
}

async function assertCategory(userId: string, categoryId: string): Promise<void> {
  const category = await db.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  if (!category) {
    throw new ServiceValidationError("Category not found", "categoryId");
  }
}

function translateUnique(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new ServiceValidationError("An identical rule already exists", "value");
  }
  throw err;
}

export async function listRules(userId: string): Promise<RuleDTO[]> {
  const rows = await db.categorizationRule.findMany({
    where: { userId },
    include: ruleInclude,
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toDTO);
}

export async function loadActiveRules(userId: string): Promise<ActiveRule[]> {
  const rows = await db.categorizationRule.findMany({
    where: { userId, isActive: true },
    include: ruleInclude,
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    field: r.field,
    operator: r.operator,
    value: r.value,
    categoryId: r.categoryId,
    categoryType: r.category.type,
    categoryName: r.category.name,
    categoryColor: r.category.color,
  }));
}

export async function createRule(
  userId: string,
  input: RuleInput,
): Promise<RuleDTO> {
  validateRule(input);
  await assertCategory(userId, input.categoryId);
  try {
    const rule = await db.categorizationRule.create({
      data: {
        userId,
        categoryId: input.categoryId,
        field: input.field,
        operator: input.operator,
        value: input.value,
        priority: input.priority,
        isActive: input.isActive,
      },
      include: ruleInclude,
    });
    return toDTO(rule);
  } catch (err) {
    translateUnique(err);
  }
}

export async function updateRule(
  userId: string,
  id: string,
  input: RuleInput,
): Promise<RuleDTO> {
  const existing = await db.categorizationRule.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError("Rule not found");

  validateRule(input);
  await assertCategory(userId, input.categoryId);

  try {
    const rule = await db.categorizationRule.update({
      where: { id },
      data: {
        categoryId: input.categoryId,
        field: input.field,
        operator: input.operator,
        value: input.value,
        priority: input.priority,
        isActive: input.isActive,
      },
      include: ruleInclude,
    });
    return toDTO(rule);
  } catch (err) {
    translateUnique(err);
  }
}

export async function deleteRule(userId: string, id: string): Promise<void> {
  const res = await db.categorizationRule.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw new NotFoundError("Rule not found");
}

/**
 * Apply active rules to the user's uncategorized transactions. A rule only
 * applies when its category type matches the transaction type (an INCOME txn
 * can't take an EXPENSE category). Returns how many matched / were updated.
 */
export async function applyRulesToTransactions(
  userId: string,
  dryRun: boolean,
): Promise<{ matched: number; updated: number }> {
  const rules = await loadActiveRules(userId);
  if (rules.length === 0) return { matched: 0, updated: 0 };

  const txs = await db.transaction.findMany({
    where: { userId, categoryId: null },
    select: { id: true, description: true, amount: true, accountId: true, type: true },
  });

  const byCategory = new Map<string, string[]>();
  let matched = 0;
  for (const tx of txs) {
    const rule = findMatchingRule(rules, {
      description: tx.description,
      amountMinor: Number(tx.amount),
      accountId: tx.accountId,
    });
    if (!rule || rule.categoryType !== tx.type) continue;
    matched++;
    const ids = byCategory.get(rule.categoryId) ?? [];
    ids.push(tx.id);
    byCategory.set(rule.categoryId, ids);
  }

  if (dryRun) return { matched, updated: 0 };

  let updated = 0;
  await db.$transaction(async (txdb) => {
    for (const [categoryId, ids] of byCategory) {
      const res = await txdb.transaction.updateMany({
        where: { id: { in: ids }, userId },
        data: { categoryId },
      });
      updated += res.count;
    }
  });
  return { matched, updated };
}

/** The example starter rules. Creates the needed expense categories if absent. */
const STARTER_RULES: Array<{ keyword: string; category: string; color: string }> = [
  { keyword: "SWIGGY", category: "Food", color: "#F59E0B" },
  { keyword: "ZOMATO", category: "Food", color: "#F59E0B" },
  { keyword: "AMAZON", category: "Shopping", color: "#D946EF" },
  { keyword: "PETROL", category: "Fuel", color: "#0EA5E9" },
];

export async function seedStarterRules(
  userId: string,
): Promise<{ created: number }> {
  // Ensure each referenced expense category exists.
  const categoryIds = new Map<string, string>();
  for (const { category, color } of STARTER_RULES) {
    if (categoryIds.has(category)) continue;
    const existing = await db.category.findFirst({
      where: { userId, name: category, type: "EXPENSE" },
      select: { id: true },
    });
    const id =
      existing?.id ??
      (
        await db.category.create({
          data: { userId, name: category, type: "EXPENSE", color },
          select: { id: true },
        })
      ).id;
    categoryIds.set(category, id);
  }

  let created = 0;
  for (const { keyword, category } of STARTER_RULES) {
    try {
      await db.categorizationRule.create({
        data: {
          userId,
          categoryId: categoryIds.get(category)!,
          field: "DESCRIPTION",
          operator: "CONTAINS",
          value: keyword,
          priority: 100,
          isActive: true,
        },
      });
      created++;
    } catch (err) {
      // Skip rules that already exist (unique constraint), surface anything else.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        continue;
      }
      throw err;
    }
  }
  return { created };
}
