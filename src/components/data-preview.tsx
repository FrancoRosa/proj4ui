import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Dataset } from "@/lib/convert"

const PREVIEW_ROWS = 10

export function DataPreview({ data }: { data: Dataset | null }) {
  if (!data) {
    return <p className="text-xs text-muted-foreground">No data yet.</p>
  }
  return (
    <div className="flex min-h-0 flex-col gap-1">
      <div className="min-h-0 overflow-auto border">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              {data.headers.map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
              <TableRow key={i}>
                {data.headers.map((h) => (
                  <TableCell key={h}>{row[h]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        {Math.min(PREVIEW_ROWS, data.rows.length)} of {data.rows.length} rows
      </p>
    </div>
  )
}
