import type { RuleField, RuleOperator } from "@prisma/client";

export const FIELD_LABEL: Record<RuleField, string> = {
  DESCRIPTION: "Description",
  AMOUNT: "Amount",
  ACCOUNT: "Account",
};

export const OPERATOR_LABEL: Record<RuleOperator, string> = {
  CONTAINS: "contains",
  EQUALS: "equals",
  STARTS_WITH: "starts with",
  ENDS_WITH: "ends with",
  REGEX: "matches regex",
  GT: "greater than",
  LT: "less than",
};

/** Fields exposed in the UI and the operators valid for each. */
export type UiField = "DESCRIPTION" | "AMOUNT";

export const RULE_FIELDS: ReadonlyArray<{ value: UiField; label: string }> = [
  { value: "DESCRIPTION", label: "Description" },
  { value: "AMOUNT", label: "Amount" },
];

export const FIELD_OPERATORS: Record<UiField, RuleOperator[]> = {
  DESCRIPTION: ["CONTAINS", "EQUALS", "STARTS_WITH", "ENDS_WITH", "REGEX"],
  AMOUNT: ["GT", "LT", "EQUALS"],
};
