/**
 * Statement import service: preview (dry-run) and commit (persist).
 *
 * Both steps share the same pure normalization + the same dedupe logic, so the
 * preview the user approves is exactly what gets written. Commit re-normalizes
 * from the raw rows server-side (never trusts client-normalized values) and
 * inserts in a single transaction, tagging rows with the import batch id and a
 * dedupe hash.
 */
import { createHash } from "node:crypto";

import type { ImportStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { normalizeRows } from "@/lib/import/normalize";
import type { NormalizedRow } from "@/lib/import/types";
import { findMatchingRule } from "@/lib/rules/engine";
import type {
  ImportCommitInput,
  ImportPreviewInput,
} from "@/lib/validation/import";
import { ServiceValidationError } from "@/server/services/errors";
import { loadActiveRules } from "@/server/services/rule.service";

export type RowStatus = "VALID" | "INVALID" | "DUPLICATE";

export interface PreviewRow extends NormalizedRow {
  status: RowStatus;
  dedupeHash: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
}

export interface ImportSummary {
  total: number;
  valid: number;
  invalid: number;
  duplicate: number;
  importable: number;
}

export interface ImportPreviewResult {
  rows: PreviewRow[];
  summary: ImportSummary;
}

export interface ImportHistoryDTO {
  id: string;
  fileName: string;
  source: string | null;
  status: ImportStatus;
  rowCount: number;
  importedCount: number;
  skippedCount: number;
  accountName: string | null;
  createdAt: string;
}

function hashRow(
  accountId: string,
  row: NormalizedRow,
): string {
  return createHash("sha256")
    .update(
      `${accountId}|${row.dateISO}|${row.type}|${row.amountMinor}|${row.description.toLowerCase()}`,
    )
    .digest("hex");
}

async function requireAccount(userId: string, accountId: string) {
  const account = await db.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true, currency: true },
  });
  if (!account) {
    throw new ServiceValidationError("Account not found", "accountId");
  }
  return account;
}

/**
 * Normalize + classify each row (VALID / INVALID / DUPLICATE). Duplicates are
 * detected both within the file and against already-imported transactions.
 */
async function classify(
  userId: string,
  accountId: string,
  input: Pick<
    ImportPreviewInput,
    "rows" | "mapping" | "amountMode" | "signConvention" | "dateFormat"
  >,
): Promise<PreviewRow[]> {
  const normalized = normalizeRows(input.rows, {
    mapping: input.mapping,
    mode: input.amountMode,
    convention: input.signConvention,
    dateHint: input.dateFormat,
  });

  // Active categorization rules — used to auto-assign a category per row.
  const rules = await loadActiveRules(userId);

  // Hash valid rows and find which hashes already exist in the DB.
  const validHashes: string[] = [];
  const hashByIndex = new Map<number, string>();
  for (const row of normalized) {
    if (row.errors.length === 0) {
      const h = hashRow(accountId, row);
      hashByIndex.set(row.index, h);
      validHashes.push(h);
    }
  }

  const existing = validHashes.length
    ? await db.transaction.findMany({
        where: { userId, dedupeHash: { in: validHashes } },
        select: { dedupeHash: true },
      })
    : [];
  const existingHashes = new Set(
    existing.map((e) => e.dedupeHash).filter((h): h is string => h !== null),
  );

  const seen = new Set<string>();
  return normalized.map((row): PreviewRow => {
    if (row.errors.length > 0) {
      return {
        ...row,
        status: "INVALID",
        dedupeHash: null,
        categoryId: null,
        categoryName: null,
        categoryColor: null,
      };
    }

    // Auto-categorize: first matching rule whose category type matches the row.
    const match = findMatchingRule(rules, {
      description: row.description,
      amountMinor: row.amountMinor!,
    });
    const applied = match && match.categoryType === row.type ? match : null;

    const hash = hashByIndex.get(row.index)!;
    const isDuplicate = existingHashes.has(hash) || seen.has(hash);
    seen.add(hash);
    return {
      ...row,
      dedupeHash: hash,
      status: isDuplicate ? "DUPLICATE" : "VALID",
      categoryId: applied?.categoryId ?? null,
      categoryName: applied?.categoryName ?? null,
      categoryColor: applied?.categoryColor ?? null,
    };
  });
}

function summarize(rows: PreviewRow[]): ImportSummary {
  const invalid = rows.filter((r) => r.status === "INVALID").length;
  const duplicate = rows.filter((r) => r.status === "DUPLICATE").length;
  const importable = rows.filter((r) => r.status === "VALID").length;
  return {
    total: rows.length,
    valid: importable,
    invalid,
    duplicate,
    importable,
  };
}

export async function previewImport(
  userId: string,
  input: ImportPreviewInput,
): Promise<ImportPreviewResult> {
  await requireAccount(userId, input.accountId);
  const rows = await classify(userId, input.accountId, input);
  return { rows, summary: summarize(rows) };
}

export async function commitImport(
  userId: string,
  input: ImportCommitInput,
): Promise<{ batchId: string; importedCount: number; skippedCount: number; total: number }> {
  const account = await requireAccount(userId, input.accountId);

  const classified = await classify(userId, input.accountId, input);
  const excluded = new Set(input.excluded);
  const toInsert = classified.filter(
    (r) => r.status === "VALID" && !excluded.has(r.index),
  );

  const batch = await db.importHistory.create({
    data: {
      userId,
      accountId: input.accountId,
      fileName: input.fileName,
      source: input.fileType ?? null,
      status: "PARSED",
      columnMapping: input.mapping,
      rowCount: input.rows.length,
    },
    select: { id: true },
  });

  try {
    const result = await db.$transaction(async (tx) => {
      const created = await tx.transaction.createMany({
        // skipDuplicates guards against the unique (userId, dedupeHash) index in
        // case of a race with a concurrent import.
        skipDuplicates: true,
        data: toInsert.map((r) => ({
          userId,
          accountId: input.accountId,
          categoryId: r.categoryId, // assigned by rules during classify()
          type: r.type!,
          amount: BigInt(r.amountMinor!),
          currency: account.currency,
          occurredOn: new Date(r.dateISO!),
          description: r.description,
          dedupeHash: r.dedupeHash,
          importBatchId: batch.id,
        })),
      });

      const importedCount = created.count;
      const skippedCount = input.rows.length - importedCount;

      await tx.importHistory.update({
        where: { id: batch.id },
        data: {
          status: "COMMITTED",
          importedCount,
          skippedCount,
        },
      });

      return { importedCount, skippedCount };
    });

    return {
      batchId: batch.id,
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
      total: input.rows.length,
    };
  } catch (err) {
    await db.importHistory.update({
      where: { id: batch.id },
      data: { status: "FAILED", errorMessage: "Import failed" },
    });
    throw err;
  }
}

export async function listImportHistory(
  userId: string,
): Promise<ImportHistoryDTO[]> {
  const rows = await db.importHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { account: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    source: r.source,
    status: r.status,
    rowCount: r.rowCount,
    importedCount: r.importedCount,
    skippedCount: r.skippedCount,
    accountName: r.account?.name ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}
