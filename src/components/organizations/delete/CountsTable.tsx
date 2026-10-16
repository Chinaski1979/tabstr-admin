import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TableCount } from "@/types";

/**
 * Pre-deletion row counts per tenant table. Shared by the dry-run plan and the
 * audit report.
 */
export function CountsTable({ counts }: { counts: TableCount[] }) {
  if (counts.length === 0) {
    return <p className="text-sm text-muted-foreground">No row counts were collected.</p>;
  }

  const totalRows = counts.reduce((sum, c) => sum + Math.max(0, c.count), 0);
  const countedTables = counts.filter((c) => !c.skipped).length;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {countedTables} tables · {totalRows.toLocaleString()} rows to delete
      </p>
      <div className="max-h-64 overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Table</TableHead>
              <TableHead className="w-40 text-right">Rows</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {counts.map((entry) => (
              <TableRow key={entry.table}>
                <TableCell className="font-mono text-xs">{entry.table}</TableCell>
                <TableCell className="text-right">
                  {entry.skipped ? (
                    <Badge variant="secondary">no organization_id</Badge>
                  ) : entry.count < 0 ? (
                    <span className="text-muted-foreground" title="Count failed">
                      —
                    </span>
                  ) : (
                    entry.count.toLocaleString()
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
