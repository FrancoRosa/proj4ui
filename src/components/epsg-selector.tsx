import { useEffect, useId, useState } from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Label } from "@/components/ui/label"
import {
  canSearch,
  COMMON_EPSG,
  fetchEpsg,
  loadRecent,
  saveRecent,
  searchEpsg,
  type EpsgInfo,
} from "@/lib/epsg"

export interface EpsgState {
  info: EpsgInfo | null
  error: string | null
  loading: boolean
}

/** Resolves an EPSG code to its name and proj4 definition. */
export function useEpsg(code: string): EpsgState {
  const [result, setResult] = useState<{ code: string; info: EpsgInfo | null; error: string | null }>()
  useEffect(() => {
    if (!code) return
    let active = true
    fetchEpsg(code).then(
      (info) => active && setResult({ code, info, error: null }),
      (err: Error) => active && setResult({ code, info: null, error: err.message })
    )
    return () => {
      active = false
    }
  }, [code])
  // Results for a previous code are stale while the new one loads.
  if (!code) return { info: null, error: null, loading: false }
  if (result?.code !== code) return { info: null, error: null, loading: true }
  return { info: result.info, error: result.error, loading: false }
}

// Accepts "32718", "EPSG:32718" or a list label like "32718 — WGS 84 / UTM zone 18S".
function parseCode(text: string) {
  return text.match(/^\s*(?:epsg:)?\s*(\d+)/i)?.[1] ?? ""
}

const label = (c: EpsgInfo) => `${c.code} — ${c.name}`

function dedupe(lists: EpsgInfo[][]) {
  const seen = new Set<string>()
  return lists.flat().filter((c) => !seen.has(c.code) && !!seen.add(c.code))
}

// Every word of the query must appear in the label, so "utm 18s peru" matches.
function matches(c: EpsgInfo, words: string[]) {
  const text = label(c).toLowerCase()
  return words.every((w) => text.includes(w))
}

interface Remote {
  query: string
  items: EpsgInfo[]
  error: string | null
}

// With a MapTiler key, search everything by name or code; otherwise only look up exact codes.
async function lookup(query: string, signal: AbortSignal): Promise<EpsgInfo[]> {
  if (canSearch) return searchEpsg(query, signal)
  return [await fetchEpsg(parseCode(query))]
}

export function EpsgSelector({
  label: fieldLabel,
  code,
  state,
  onChange,
}: {
  label: string
  code: string
  state: EpsgState
  onChange: (code: string) => void
}) {
  const id = useId()
  const [inputValue, setInputValue] = useState("")
  const [recent, setRecent] = useState(loadRecent)
  const [remote, setRemote] = useState<Remote>()

  const known = dedupe([recent, COMMON_EPSG])
  const selected = known.find((c) => c.code === code) ?? state.info ?? null
  // After a pick the input shows the selected label; treat that as no query so the full list shows.
  const query = selected && inputValue === label(selected) ? "" : inputValue.trim()
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const local = known.filter((c) => matches(c, words))

  const queryCode = parseCode(query)
  const shouldLookup = canSearch
    ? query.length >= 2
    : queryCode.length >= 4 && !known.some((c) => c.code === queryCode)
  const current = shouldLookup && remote?.query === query ? remote : undefined
  const searching = shouldLookup && !current
  const items = dedupe([local, current?.items ?? []])

  useEffect(() => {
    if (!shouldLookup) return
    const controller = new AbortController()
    // Wait for the user to stop typing before calling the API.
    const timer = setTimeout(() => {
      lookup(query, controller.signal).then(
        (found) => setRemote({ query, items: found, error: null }),
        (err: Error) => {
          if (err.name === "AbortError") return
          setRemote({ query, items: [], error: canSearch ? err.message : null })
        }
      )
    }, 350)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [shouldLookup, query])

  const emptyMessage = searching
    ? "Searching epsg.io…"
    : current?.error
      ? current.error
      : canSearch || shouldLookup
        ? `No EPSG match for "${query}"`
        : "No match. Type a code number to look it up on epsg.io."

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{fieldLabel}</Label>
      <Combobox
        items={items}
        value={selected}
        itemToStringLabel={label}
        isItemEqualToValue={(a, b) => a.code === b.code}
        onInputValueChange={setInputValue}
        filter={null}
        onValueChange={(info) => {
          if (!info) return
          setRecent(saveRecent(info))
          if (info.code !== code) onChange(info.code)
        }}
        autoHighlight
      >
        <ComboboxInput id={id} placeholder="Search code or name, e.g. 4326" aria-invalid={!!state.error} />
        <ComboboxContent>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          <ComboboxList>
            {(item: EpsgInfo) => (
              <ComboboxItem key={item.code} value={item} title={label(item)}>
                <span className="w-12 shrink-0 tabular-nums">{item.code}</span>
                <span className="truncate text-muted-foreground">{item.name}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p className="min-h-5 text-xs text-muted-foreground">
        {state.loading && "Looking up on epsg.io…"}
        {state.info && state.info.name}
        {state.error && <span className="text-destructive">{state.error}</span>}
      </p>
    </div>
  )
}
