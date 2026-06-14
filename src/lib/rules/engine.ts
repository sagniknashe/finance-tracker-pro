/**
 * Categorization rule engine (pure, DB-agnostic, testable).
 *
 * Rules are evaluated in priority order; the first match wins. A rule targets a
 * transaction field (description / amount / account) with an operator. Callers
 * pass rules already filtered to active and sorted by priority.
 */
import type { CategoryType, RuleField, RuleOperator } from "@prisma/client";

export interface EngineRule {
  id: string;
  field: RuleField;
  operator: RuleOperator;
  value: string;
  categoryId: string;
  /** Used by callers to enforce the income/expense type match. */
  categoryType?: CategoryType;
}

export interface EngineTransaction {
  description: string;
  amountMinor: number;
  accountId?: string;
}

function matchString(target: string, op: RuleOperator, value: string): boolean {
  const t = target.toLowerCase();
  const v = value.toLowerCase();
  switch (op) {
    case "CONTAINS":
      return t.includes(v);
    case "EQUALS":
      return t === v;
    case "STARTS_WITH":
      return t.startsWith(v);
    case "ENDS_WITH":
      return t.endsWith(v);
    case "REGEX":
      try {
        return new RegExp(value, "i").test(target);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function matchAmount(amountMinor: number, op: RuleOperator, value: string): boolean {
  const major = Number.parseFloat(value);
  if (Number.isNaN(major)) return false;
  const ruleMinor = Math.round(major * 100);
  switch (op) {
    case "GT":
      return amountMinor > ruleMinor;
    case "LT":
      return amountMinor < ruleMinor;
    case "EQUALS":
      return amountMinor === ruleMinor;
    default:
      return false;
  }
}

export function matchRule(rule: EngineRule, tx: EngineTransaction): boolean {
  switch (rule.field) {
    case "DESCRIPTION":
      return matchString(tx.description, rule.operator, rule.value);
    case "AMOUNT":
      return matchAmount(tx.amountMinor, rule.operator, rule.value);
    case "ACCOUNT":
      return rule.operator === "EQUALS" && tx.accountId === rule.value;
    default:
      return false;
  }
}

/** First matching rule (rules must be pre-sorted by priority), or null. */
export function findMatchingRule<R extends EngineRule>(
  rules: R[],
  tx: EngineTransaction,
): R | null {
  for (const rule of rules) {
    if (matchRule(rule, tx)) return rule;
  }
  return null;
}
