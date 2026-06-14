import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { ImportHistoryDTO } from "@/server/services/import.service";

const STATUS_STYLE: Record<string, string> = {
  COMMITTED: "bg-success/10 text-success",
  FAILED: "bg-danger/10 text-danger",
  PENDING: "bg-muted text-muted-foreground",
  PARSED: "bg-muted text-muted-foreground",
  PREVIEWED: "bg-muted text-muted-foreground",
};

/** Server component: lists recent import batches. */
export function ImportHistory({ items }: { items: ImportHistoryDTO[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base text-foreground">Import history</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No imports yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">File</th>
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 text-right font-medium">Imported</th>
                  <th className="px-3 py-2 text-right font-medium">Skipped</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="max-w-[14rem] truncate px-3 py-2" title={it.fileName}>
                      {it.fileName}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {it.accountName ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {it.importedCount}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {it.skippedCount}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          STATUS_STYLE[it.status] ?? "bg-muted text-muted-foreground",
                        )}
                      >
                        {it.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {new Date(it.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
