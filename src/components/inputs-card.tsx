import { useRef, useState } from "react"
import Papa from "papaparse"
import { EyeIcon, EyeOffIcon, UploadIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataPreview } from "@/components/data-preview"
import { EpsgSelector, type EpsgState } from "@/components/epsg-selector"
import { INPUT_COLOR } from "@/components/map-view"
import type { Dataset, Row } from "@/lib/convert"

function ColumnSelect({
  label,
  headers,
  value,
  onChange,
}: {
  label: string
  headers: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(v) => v && onChange(v as string)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Column" />
        </SelectTrigger>
        <SelectContent>
          {headers.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Picks the first header that looks like an x / y column.
function guessColumn(headers: string[], pattern: RegExp, fallback: number) {
  return headers.find((h) => pattern.test(h.trim())) ?? headers[fallback] ?? ""
}

export function InputsCard({
  epsg,
  epsgState,
  onEpsgChange,
  data,
  onDataChange,
  showPoints,
  onShowPointsChange,
  pointCount,
}: {
  epsg: string
  epsgState: EpsgState
  onEpsgChange: (code: string) => void
  data: Dataset | null
  onDataChange: (data: Dataset | null) => void
  showPoints: boolean
  onShowPointsChange: (show: boolean) => void
  pointCount: number
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [single, setSingle] = useState({ x: "", y: "" })
  const [uploadError, setUploadError] = useState<string | null>(null)
  const isFile = !!data?.name

  const handleFile = (file: File) => {
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data: rows, meta, errors }) => {
        const headers = meta.fields ?? []
        if (headers.length < 2 || rows.length === 0) {
          setUploadError(errors[0]?.message ?? "The CSV needs a header row and at least two columns.")
          return
        }
        setUploadError(null)
        setSingle({ x: "", y: "" })
        onDataChange({
          name: file.name,
          headers,
          rows,
          xCol: guessColumn(headers, /^(x|lng|lon|long|longitude|east|easting|este)$/i, 0),
          yCol: guessColumn(headers, /^(y|lat|latitude|north|northing|norte)$/i, 1),
        })
      },
      error: (err) => setUploadError(err.message),
    })
  }

  const setSingleCoord = (next: { x: string; y: string }) => {
    setSingle(next)
    onDataChange(
      next.x || next.y
        ? { name: "", headers: ["x", "y"], rows: [next], xCol: "x", yCol: "y" }
        : null
    )
  }

  return (
    <Card size="sm" className="max-h-full border-t-4 bg-card/80 backdrop-blur-sm lg:max-h-[calc(100svh-1.5rem)]" style={{ borderTopColor: INPUT_COLOR }}>
      <CardHeader>
        <CardTitle>Inputs</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        <EpsgSelector label="Input EPSG" code={epsg} state={epsgState} onChange={onEpsgChange} />

        <div className="flex flex-col gap-1.5">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
              e.target.value = ""
            }}
          />
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <UploadIcon data-icon="inline-start" />
            Upload CSV
          </Button>
          {isFile && (
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">{data.name}</span>
              <Button variant="ghost" size="icon-xs" aria-label="Remove file" onClick={() => onDataChange(null)}>
                <XIcon />
              </Button>
            </div>
          )}
          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
        </div>

        {isFile ? (
          <div className="flex gap-3">
            <ColumnSelect
              label="X column"
              headers={data.headers}
              value={data.xCol}
              onChange={(xCol) => onDataChange({ ...data, xCol })}
            />
            <ColumnSelect
              label="Y column"
              headers={data.headers}
              value={data.yCol}
              onChange={(yCol) => onDataChange({ ...data, yCol })}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label>Or a single coordinate</Label>
            <div className="flex gap-3">
              <Input
                placeholder="x / lng"
                inputMode="decimal"
                value={single.x}
                onChange={(e) => setSingleCoord({ ...single, x: e.target.value })}
              />
              <Input
                placeholder="y / lat"
                inputMode="decimal"
                value={single.y}
                onChange={(e) => setSingleCoord({ ...single, y: e.target.value })}
              />
            </div>
          </div>
        )}

        <DataPreview data={isFile ? data : null} />
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="w-full"
          disabled={pointCount === 0}
          onClick={() => onShowPointsChange(!showPoints)}
        >
          {showPoints ? <EyeOffIcon data-icon="inline-start" /> : <EyeIcon data-icon="inline-start" />}
          {showPoints ? "Hide input points" : "Show input points"}
        </Button>
      </CardFooter>
    </Card>
  )
}
