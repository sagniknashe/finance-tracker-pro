/**
 * Category domain service. Categories are per-user and may have a same-type
 * parent (one level of nesting). Deleting a category sets its transactions to
 * uncategorized (FK SET NULL) and cascades to child categories.
 */
import { Prisma, type CategoryType } from "@prisma/client";

import { db } from "@/lib/db";
import type { CategoryInput } from "@/lib/validation/category";
import { NotFoundError, ServiceValidationError } from "@/server/services/errors";

export interface CategoryDTO {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string | null;
  parentId: string | null;
  parentName: string | null;
  isSystem: boolean;
  transactionCount: number;
  childCount: number;
}

const include = {
  parent: { select: { name: true } },
  _count: { select: { transactions: true, children: true } },
} satisfies Prisma.CategoryInclude;

type CategoryRow = Prisma.CategoryGetPayload<{ include: typeof include }>;

function toDTO(c: CategoryRow): CategoryDTO {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    color: c.color,
    icon: c.icon,
    parentId: c.parentId,
    parentName: c.parent?.name ?? null,
    isSystem: c.isSystem,
    transactionCount: c._count.transactions,
    childCount: c._count.children,
  };
}

/** A parent must exist, belong to the user, share the child's type, and not be
 *  the category itself. */
async function validateParent(
  userId: string,
  type: CategoryType,
  parentId: string | null | undefined,
  selfId?: string,
): Promise<void> {
  if (!parentId) return;
  if (parentId === selfId) {
    throw new ServiceValidationError("A category cannot be its own parent", "parentId");
  }
  const parent = await db.category.findFirst({
    where: { id: parentId, userId },
    select: { type: true, parentId: true },
  });
  if (!parent) {
    throw new ServiceValidationError("Parent category not found", "parentId");
  }
  if (parent.type !== type) {
    throw new ServiceValidationError(
      "Parent must be the same type (income/expense)",
      "parentId",
    );
  }
  // Keep nesting to a single level.
  if (parent.parentId) {
    throw new ServiceValidationError(
      "Categories can only be nested one level deep",
      "parentId",
    );
  }
}

function translateUnique(err: unknown): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    throw new ServiceValidationError(
      "A category with this name and type already exists",
      "name",
    );
  }
  throw err;
}

export async function listCategories(userId: string): Promise<CategoryDTO[]> {
  const rows = await db.category.findMany({
    where: { userId },
    include,
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return rows.map(toDTO);
}

export async function createCategory(
  userId: string,
  input: CategoryInput,
): Promise<CategoryDTO> {
  await validateParent(userId, input.type, input.parentId);
  try {
    const c = await db.category.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        color: input.color,
        icon: input.icon ?? null,
        parentId: input.parentId ?? null,
      },
      include,
    });
    return toDTO(c);
  } catch (err) {
    translateUnique(err);
  }
}

export async function updateCategory(
  userId: string,
  id: string,
  input: CategoryInput,
): Promise<CategoryDTO> {
  const existing = await db.category.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError("Category not found");

  await validateParent(userId, input.type, input.parentId, id);

  try {
    const c = await db.category.update({
      where: { id },
      data: {
        name: input.name,
        type: input.type,
        color: input.color,
        icon: input.icon ?? null,
        parentId: input.parentId ?? null,
      },
      include,
    });
    return toDTO(c);
  } catch (err) {
    translateUnique(err);
  }
}

export async function deleteCategory(userId: string, id: string): Promise<void> {
  const res = await db.category.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw new NotFoundError("Category not found");
}
