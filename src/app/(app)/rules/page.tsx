import type { Metadata } from "next";

import { RulesView } from "@/components/features/rules/rules-view";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth/guards";
import { listRules } from "@/server/services/rule.service";

export const metadata: Metadata = {
  title: "Smart Categorization · Finance Tracker Pro",
};
export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const user = await requireUser();

  const [rules, categories] = await Promise.all([
    listRules(user.id),
    db.category.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, type: true, color: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <RulesView initial={rules} categories={categories} />
    </div>
  );
}
