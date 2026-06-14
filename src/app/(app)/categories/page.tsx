import type { Metadata } from "next";

import { CategoriesView } from "@/components/features/categories/categories-view";
import { requireUser } from "@/server/auth/guards";
import { listCategories } from "@/server/services/category.service";

export const metadata: Metadata = { title: "Categories · Finance Tracker Pro" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const user = await requireUser();
  const categories = await listCategories(user.id);

  return (
    <div className="mx-auto max-w-5xl">
      <CategoriesView initial={categories} />
    </div>
  );
}
