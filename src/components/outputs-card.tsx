import Papa from "papaparse"
import { DownloadIcon, EyeIcon, EyeOffIcon, RefreshCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DataPreview } from "@/components/data-preview"
import { EpsgSelector, type EpsgState } from "@/components/epsg-selector"
import { OUTPUT_COLOR } from "@/components/map-view"
import type { Dataset } from "@/lib/convert"

function download(data: Dataset) {
  const csv = Papa.unparse({ fields: data.headers, data: data.rows.map((r) => data.headers.map((h) => r[h])) })
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = data.name
  a.click()
  URL.revokeObjectURL(url)
}

export function OutputsCard({
  epsg,
  epsgState,
  onEpsgChange,
  data,
  skipped,
  showPoints,
  onShowPointsChange,
  pointCount,
  canConvert,
  onConvert,
}: {
  epsg: string
  epsgState: EpsgState
  onEpsgChange: (code: string) => void
  data: Dataset | null
  skipped: number
  showPoints: boolean
  onShowPointsChange: (show: boolean) => void
  pointCount: number
  canConvert: boolean
  onConvert: () => void
}) {
  return (
    <Card size="sm" className="max-h-full border-t-4 bg-card/80 backdrop-blur-sm lg:max-h-[calc(100svh-1.5rem)]" style={{ borderTopColor: OUTPUT_COLOR }}>
      <CardHeader>
        <CardTitle>Outputs</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <EpsgSelector label="Output EPSG" code={epsg} state={epsgState} onChange={onEpsgChange} />
        {skipped > 0 && (
          <p className="text-xs text-destructive">
            {skipped} row{skipped === 1 ? "" : "s"} skipped (non-numeric x / y).
          </p>
        )}
        <DataPreview data={data} />
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="w-full"
          disabled={pointCount === 0}
          onClick={() => onShowPointsChange(!showPoints)}
        >
          {showPoints ? <EyeOffIcon data-icon="inline-start" /> : <EyeIcon data-icon="inline-start" />}
          {showPoints ? "Hide output points" : "Show output points"}
        </Button>
        <Button className="w-full" disabled={!canConvert} onClick={onConvert}>
          <RefreshCwIcon data-icon="inline-start" />
          Convert
        </Button>
        <Button className="w-full" disabled={!data} onClick={() => data && download(data)}>
          <DownloadIcon data-icon="inline-start" />
          Download CSV
        </Button>
      </CardFooter>
    </Card>
  )
}
