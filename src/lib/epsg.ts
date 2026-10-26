import proj4 from "proj4"

export interface EpsgInfo {
  code: string
  name: string
}

// Codes offered in the selector dropdown. Any other code can still be typed.
export const COMMON_EPSG: EpsgInfo[] = [
  { code: "4326", name: "WGS 84" },
  { code: "3857", name: "WGS 84 / Pseudo-Mercator" },
  { code: "4269", name: "NAD83" },
  { code: "4258", name: "ETRS89" },
  { code: "3035", name: "ETRS89-extended / LAEA Europe" },
  { code: "25830", name: "ETRS89 / UTM zone 30N" },
  { code: "27700", name: "OSGB36 / British National Grid" },
  { code: "2154", name: "ETRS89-FRA [RGF93 v1] / Lambert-93" },
  { code: "5070", name: "NAD83 / Conus Albers" },
  { code: "26918", name: "NAD83 / UTM zone 18N" },
  { code: "32617", name: "WGS 84 / UTM zone 17N" },
  { code: "32618", name: "WGS 84 / UTM zone 18N" },
  { code: "32717", name: "WGS 84 / UTM zone 17S" },
  { code: "32718", name: "WGS 84 / UTM zone 18S" },
  { code: "32719", name: "WGS 84 / UTM zone 19S" },
  { code: "5373", name: "Peru96" },
  { code: "5839", name: "Peru96 / UTM zone 17S" },
  { code: "5387", name: "Peru96 / UTM zone 18S" },
  { code: "5389", name: "Peru96 / UTM zone 19S" },
  { code: "24877", name: "PSAD56 / UTM zone 17S" },
  { code: "24878", name: "PSAD56 / UTM zone 18S" },
  { code: "24879", name: "PSAD56 / UTM zone 19S" },
  { code: "31983", name: "SIRGAS 2000 / UTM zone 23S" },
  { code: "4674", name: "SIRGAS 2000" },
]

const cache = new Map<string, Promise<EpsgInfo>>()

async function load(code: string): Promise<EpsgInfo> {
  const [defRes, jsonRes] = await Promise.all([
    fetch(`https://epsg.io/${code}.proj4`),
    fetch(`https://epsg.io/${code}.json`),
  ])
  if (!defRes.ok || !jsonRes.ok) throw new Error(`EPSG:${code} not found`)
  const def = (await defRes.text()).trim()
  if (!def.startsWith("+")) throw new Error(`EPSG:${code} has no proj4 definition`)
  const { name } = (await jsonRes.json()) as { name?: string }
  proj4.defs(`EPSG:${code}`, def)
  return { code, name: name ?? `EPSG:${code}` }
}

const MAPTILER_KEY = import.meta.env.PUBLIC_MAPTILER_KEY

/** Whether full-text search (MapTiler Coordinates API, which backs epsg.io) is available. */
export const canSearch = !!MAPTILER_KEY

interface SearchResult {
  id: { authority: string; code: number }
  kind: string
  name: string
  deprecated: boolean
  exports?: { proj4?: string }
}

/** Searches all EPSG CRSs by name or code, and registers the results with proj4. */
export async function searchEpsg(query: string, signal: AbortSignal): Promise<EpsgInfo[]> {
  const url = `https://api.maptiler.com/coordinates/search/${encodeURIComponent(query)}.json?key=${MAPTILER_KEY}&exports=true&limit=30`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Search failed (${res.status})`)
  const { results } = (await res.json()) as { results: SearchResult[] }
  return results
    .filter(
      (r) =>
        r.id.authority === "EPSG" &&
        !r.deprecated &&
        (r.kind === "CRS-PROJCRS" || r.kind === "CRS-GEOGCRS") &&
        r.exports?.proj4?.startsWith("+")
    )
    .map((r) => {
      const info = { code: String(r.id.code), name: r.name }
      // Prime the lookup cache so picking a result needs no second request.
      if (!cache.has(info.code)) {
        proj4.defs(`EPSG:${info.code}`, r.exports!.proj4!)
        cache.set(info.code, Promise.resolve(info))
      }
      return info
    })
}

/** Fetches an EPSG definition from epsg.io and registers it with proj4. */
export function fetchEpsg(code: string): Promise<EpsgInfo> {
  let entry = cache.get(code)
  if (!entry) {
    entry = load(code)
    // Drop failed lookups so they can be retried.
    entry.catch(() => cache.delete(code))
    cache.set(code, entry)
  }
  return entry
}

const RECENT_KEY = "epsg-recent"
const RECENT_MAX = 10

/** Codes the user picked before, most recent first, so looked-up codes stay in the list. */
export function loadRecent(): EpsgInfo[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]")
    return Array.isArray(parsed) ? parsed.filter((c): c is EpsgInfo => !!c?.code && !!c?.name) : []
  } catch {
    return []
  }
}

export function saveRecent(info: EpsgInfo): EpsgInfo[] {
  const next = [info, ...loadRecent().filter((c) => c.code !== info.code)].slice(0, RECENT_MAX)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable; the list just won't persist.
  }
  return next
}
