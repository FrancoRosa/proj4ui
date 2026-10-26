import proj4 from "proj4"

export type Row = Record<string, string>

export interface Dataset {
  /** CSV file name, or "" for a single typed coordinate. */
  name: string
  headers: string[]
  rows: Row[]
  xCol: string
  yCol: string
}

export interface Point {
  lng: number
  lat: number
  row: Row
}

function parseCoord(row: Row, xCol: string, yCol: string) {
  const x = Number(row[xCol])
  const y = Number(row[yCol])
  if (row[xCol]?.trim() === "" || row[yCol]?.trim() === "") return null
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return [x, y] as const
}

/** Converts every row from one EPSG to another, skipping rows with non-numeric x / y. */
export function convertDataset(data: Dataset, from: string, to: string) {
  const transform = proj4(`EPSG:${from}`, `EPSG:${to}`)
  const xOut = `x_epsg${to}`
  const yOut = `y_epsg${to}`
  const rows: Row[] = []
  let skipped = 0
  for (const row of data.rows) {
    const coord = parseCoord(row, data.xCol, data.yCol)
    const out = coord && transform.forward([coord[0], coord[1]])
    if (!out || !Number.isFinite(out[0]) || !Number.isFinite(out[1])) {
      skipped++
      continue
    }
    rows.push({ ...row, [xOut]: String(out[0]), [yOut]: String(out[1]) })
  }
  const output: Dataset = {
    name: (data.name || "coordinate").replace(/\.csv$/i, "") + `_epsg${to}.csv`,
    headers: [...data.headers.filter((h) => h !== xOut && h !== yOut), xOut, yOut],
    rows,
    xCol: xOut,
    yCol: yOut,
  }
  return { output, skipped }
}

/** Reprojects a dataset to WGS84 for display on the map. */
export function toMapPoints(data: Dataset | null, epsg: string): Point[] {
  if (!data) return []
  const transform = proj4(`EPSG:${epsg}`, "EPSG:4326")
  const points: Point[] = []
  for (const row of data.rows) {
    const coord = parseCoord(row, data.xCol, data.yCol)
    if (!coord) continue
    const [lng, lat] = transform.forward([coord[0], coord[1]])
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) points.push({ lng, lat, row })
  }
  return points
}
