/**
 * Transaction domain service.
 *
 * Owns all transaction reads/writes plus the cross-row invariants that the DB
 * can't express on its own:
 *   - the account must belong to the user (and be active for new postings)
 *   - the category (if any) must belong to the user and match the txn type
 *     (an INCOME transaction can only use an INCOME category)
 *
 * Amounts are stored as BigInt minor units; DTOs expose plain numbers so they
 * are safe to serialize to the client.
 */
import type { Prisma, TransactionType } from "@prisma/client";

import { db } from "@/lib/db";
import { toMinor } from "@/lib/money";
import type { ListQuery, TransactionInput } from "@/lib/validation/transaction";
import { NotFoundError, ServiceValidationError } from "@/server/services/errors";

export interface TransactionDTO {
  id: string;
  type: TransactionType;
  date: string; // ISO date
  amount: number; // minor units
  currency: string;
  description: string;
  notes: string | null;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
}

export interface TransactionListResult {
  data: TransactionDTO[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  totals: { income: number; expense: number; net: number };
}

const txInclude = {
  account: { select: { name: true } },
  category: { select: { name: true, color: true } },
} satisfies Prisma.TransactionInclude;

type TxWithRelations = Prisma.TransactionGetPayload<{ include: typeof txInclude }>;

function toDTO(t: TxWithRelations): TransactionDTO {
  return {
    id: t.id,
    type: t.type,
    date: t.occurredOn.toISOString(),
    amount: Number(t.amount),
    currency: t.currency,
    description: t.description,
    notes: t.notes,
    accountId: t.accountId,
    accountName: t.account.name,
    categoryId: t.categoryId,
    categoryName: t.category?.name ?? null,
    categoryColor: t.category?.color ?? null,
  };
}

/**
 * Resolve and validate the account + category for a write, enforcing ownership
 * and the type-match invariant. Returns the account currency to stamp on the row.
 */
async function resolveRefs(
  userId: string,
  input: TransactionInput,
  { requireActiveAccount }: { requireActiveAccount: boolean },
): Promise<{ currency: string }> {
  const account = await db.account.findFirst({
    where: { id: input.accountId, userId },
    select: { currency: true, isArchived: true },
  });
  if (!account) {
    throw new ServiceValidationError("Account not found", "accountId");
  }
  if (requireActiveAccount && account.isArchived) {
    throw new ServiceValidationError(
      "Cannot post to an archived account",
      "accountId",
    );
  }

  if (input.categoryId) {
    const category = await db.category.findFirst({
      where: { id: input.categoryId, userId },
      select: { type: true },
    });
    if (!category) {
      throw new ServiceValidationError("Category not found", "categoryId");
    }
    if (category.type !== input.type) {
      throw new ServiceValidationError(
        `Category type must be ${input.type}`,
        "categoryId",
      );
    }
  }

  return { currency: account.currency };
}

/** Build a user-scoped where-filter shared by list + export. */
export type TransactionFilters = Pick<
  ListQuery,
  "type" | "accountId" | "categoryId" | "search" | "from" | "to"
>;

function buildWhere(
  userId: string,
  query: TransactionFilters,
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { userId };
  if (query.type) where.type = query.type;
  if (query.accountId) where.accountId = query.accountId;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.search) {
    where.description = { contains: query.search, mode: "insensitive" };
  }
  if (query.from || query.to) {
    const occurredOn: Prisma.DateTimeFilter = {};
    if (query.from) occurredOn.gte = query.from;
    if (query.to) occurredOn.lte = query.to;
    where.occurredOn = occurredOn;
  }
  return where;
}

/** All matching transactions (no pagination) — for export. Capped for safety. */
export async function getAllTransactions(
  userId: string,
  filters: TransactionFilters,
  cap = 10000,
): Promise<TransactionDTO[]> {
  const rows = await db.transaction.findMany({
    where: buildWhere(userId, filters),
    include: txInclude,
    orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
    take: cap,
  });
  return rows.map(toDTO);
}

export async function listTransactions(
  userId: string,
  query: ListQuery,
): Promise<TransactionListResult> {
  const where = buildWhere(userId, query);
  const skip = (query.page - 1) * query.pageSize;

  const [total, rows, grouped] = await Promise.all([
    db.transaction.count({ where }),
    db.transaction.findMany({
      where,
      include: txInclude,
      orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
      skip,
      take: query.pageSize,
    }),
    // Totals across the entire filtered set (not just the current page).
    db.transaction.groupBy({
      by: ["type"],
      _sum: { amount: true },
      where,
    }),
  ]);

  let income = 0;
  let expense = 0;
  for (const g of grouped) {
    if (g.type === "INCOME") income = Number(g._sum.amount ?? 0);
    if (g.type === "EXPENSE") expense = Number(g._sum.amount ?? 0);
  }

  return {
    data: rows.map(toDTO),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    totals: { income, expense, net: income - expense },
  };
}

export async function getTransaction(
  userId: string,
  id: string,
): Promise<TransactionDTO> {
  const tx = await db.transaction.findFirst({
    where: { id, userId },
    include: txInclude,
  });
  if (!tx) throw new NotFoundError("Transaction not found");
  return toDTO(tx);
}

export async function createTransaction(
  userId: string,
  input: TransactionInput,
): Promise<TransactionDTO> {
  const { currency } = await resolveRefs(userId, input, {
    requireActiveAccount: true,
  });

  const tx = await db.transaction.create({
    data: {
      userId,
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      type: input.type,
      amount: BigInt(toMinor(input.amount)),
      currency,
      occurredOn: input.date,
      description: input.description ?? "",
      notes: input.notes ?? null,
    },
    include: txInclude,
  });
  return toDTO(tx);
}

export async function updateTransaction(
  userId: string,
  id: string,
  input: TransactionInput,
): Promise<TransactionDTO> {
  // Scope the existence check to the owner.
  const existing = await db.transaction.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError("Transaction not found");

  // Editing may target an archived account it already lives on, so don't force
  // active here.
  const { currency } = await resolveRefs(userId, input, {
    requireActiveAccount: false,
  });

  const tx = await db.transaction.update({
    where: { id },
    data: {
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      type: input.type,
      amount: BigInt(toMinor(input.amount)),
      currency,
      occurredOn: input.date,
      description: input.description ?? "",
      notes: input.notes ?? null,
    },
    include: txInclude,
  });
  return toDTO(tx);
}

export async function deleteTransaction(
  userId: string,
  id: string,
): Promise<void> {
  // deleteMany scopes by userId so one user can't delete another's row.
  const res = await db.transaction.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw new NotFoundError("Transaction not found");
}

/** Create a copy of an existing transaction (new row, same field values). */
export async function duplicateTransaction(
  userId: string,
  id: string,
): Promise<TransactionDTO> {
  const src = await db.transaction.findFirst({ where: { id, userId } });
  if (!src) throw new NotFoundError("Transaction not found");

  const tx = await db.transaction.create({
    data: {
      userId,
      accountId: src.accountId,
      categoryId: src.categoryId,
      type: src.type,
      amount: src.amount,
      currency: src.currency,
      occurredOn: src.occurredOn,
      description: src.description,
      notes: src.notes,
      // Deliberately NOT copied: transferPairId, importBatchId, dedupeHash —
      // the copy is an independent manual entry.
    },
    include: txInclude,
  });
  return toDTO(tx);
}
