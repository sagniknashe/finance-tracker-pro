/**
 * Account domain service. Balance is derived: opening balance + income −
 * expense for the account (transfers are out of scope for this module and net
 * to zero anyway). Accounts with transactions cannot be hard-deleted (FK
 * RESTRICT) — callers archive them instead.
 */
import { Prisma, type AccountType } from "@prisma/client";

import { db } from "@/lib/db";
import { toMinor } from "@/lib/money";
import type { AccountInput } from "@/lib/validation/account";
import { NotFoundError, ServiceValidationError } from "@/server/services/errors";

export interface AccountDTO {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number; // minor units
  currency: string;
  isArchived: boolean;
  balance: number; // derived, minor units
  transactionCount: number;
}

/** Net income−expense flows for a single account. */
async function accountFlows(
  userId: string,
  accountId: string,
): Promise<{ income: number; expense: number }> {
  const grouped = await db.transaction.groupBy({
    by: ["type"],
    _sum: { amount: true },
    where: { userId, accountId },
  });
  let income = 0;
  let expense = 0;
  for (const g of grouped) {
    if (g.type === "INCOME") income = Number(g._sum.amount ?? 0);
    if (g.type === "EXPENSE") expense = Number(g._sum.amount ?? 0);
  }
  return { income, expense };
}

function translateUnique(err: unknown): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    throw new ServiceValidationError(
      "An account with this name already exists",
      "name",
    );
  }
  throw err;
}

export async function listAccounts(
  userId: string,
  includeArchived = true,
): Promise<AccountDTO[]> {
  const where: Prisma.AccountWhereInput = { userId };
  if (!includeArchived) where.isArchived = false;

  const [accounts, grouped] = await Promise.all([
    db.account.findMany({
      where,
      orderBy: [{ isArchived: "asc" }, { name: "asc" }],
      include: { _count: { select: { transactions: true } } },
    }),
    // One query for every account's flows, keyed by accountId + type.
    db.transaction.groupBy({
      by: ["accountId", "type"],
      _sum: { amount: true },
      where: { userId },
    }),
  ]);

  const flows = new Map<string, { income: number; expense: number }>();
  for (const g of grouped) {
    const entry = flows.get(g.accountId) ?? { income: 0, expense: 0 };
    if (g.type === "INCOME") entry.income = Number(g._sum.amount ?? 0);
    if (g.type === "EXPENSE") entry.expense = Number(g._sum.amount ?? 0);
    flows.set(g.accountId, entry);
  }

  return accounts.map((a) => {
    const f = flows.get(a.id) ?? { income: 0, expense: 0 };
    const opening = Number(a.openingBalance);
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      openingBalance: opening,
      currency: a.currency,
      isArchived: a.isArchived,
      balance: opening + f.income - f.expense,
      transactionCount: a._count.transactions,
    };
  });
}

export async function createAccount(
  userId: string,
  input: AccountInput,
): Promise<AccountDTO> {
  const openingMinor = toMinor(input.openingBalance);
  try {
    const a = await db.account.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        openingBalance: BigInt(openingMinor),
        currency: input.currency,
        isArchived: input.isArchived ?? false,
      },
    });
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      openingBalance: openingMinor,
      currency: a.currency,
      isArchived: a.isArchived,
      balance: openingMinor, // no transactions yet
      transactionCount: 0,
    };
  } catch (err) {
    translateUnique(err);
  }
}

export async function updateAccount(
  userId: string,
  id: string,
  input: AccountInput,
): Promise<AccountDTO> {
  const existing = await db.account.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError("Account not found");

  const openingMinor = toMinor(input.openingBalance);
  try {
    const a = await db.account.update({
      where: { id },
      data: {
        name: input.name,
        type: input.type,
        openingBalance: BigInt(openingMinor),
        currency: input.currency,
        ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
      },
      include: { _count: { select: { transactions: true } } },
    });
    const f = await accountFlows(userId, id);
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      openingBalance: openingMinor,
      currency: a.currency,
      isArchived: a.isArchived,
      balance: openingMinor + f.income - f.expense,
      transactionCount: a._count.transactions,
    };
  } catch (err) {
    translateUnique(err);
  }
}

export async function deleteAccount(userId: string, id: string): Promise<void> {
  const account = await db.account.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!account) throw new NotFoundError("Account not found");

  const txCount = await db.transaction.count({ where: { userId, accountId: id } });
  if (txCount > 0) {
    throw new ServiceValidationError(
      "This account has transactions. Archive it instead of deleting.",
      "id",
    );
  }

  await db.account.delete({ where: { id } });
}
