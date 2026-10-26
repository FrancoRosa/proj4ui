import { useMemo, useState } from "react"
import { useEpsg } from "@/components/epsg-selector"
import { InputsCard } from "@/components/inputs-card"
import { INPUT_COLOR, MapView, OUTPUT_COLOR } from "@/components/map-view"
import { OutputsCard } from "@/components/outputs-card"
import { ThemeToggle, useTheme } from "@/components/theme-toggle"
import { convertDataset, toMapPoints, type Dataset } from "@/lib/convert"

export function App() {
  const [inputEpsg, setInputEpsg] = useState("4326")
  const [outputEpsg, setOutputEpsg] = useState("")
  const [input, setInput] = useState<Dataset | null>(null)
  const [result, setResult] = useState<{
    output: Dataset
    skipped: number
  } | null>(null)
  const [showInputs, setShowInputs] = useState(false)
  const [showOutputs, setShowOutputs] = useState(false)

  const theme = useTheme()
  const inputState = useEpsg(inputEpsg)
  const outputState = useEpsg(outputEpsg)

  // Any change to the inputs or the target projection invalidates the last conversion.
  const clearResult = () => {
    setResult(null)
    setShowOutputs(false)
  }

  // Points are only computed once their EPSG definition is registered with proj4.
  const inputPoints = useMemo(
    () =>
      inputState.info?.code === inputEpsg ? toMapPoints(input, inputEpsg) : [],
    [input, inputEpsg, inputState.info]
  )
  const outputPoints = useMemo(
    () =>
      result && outputState.info?.code === outputEpsg
        ? toMapPoints(result.output, outputEpsg)
        : [],
    [result, outputEpsg, outputState.info]
  )

  const layers = useMemo(
    () => [
      {
        id: "inputs" as const,
        points: inputPoints,
        visible: showInputs,
        color: INPUT_COLOR,
      },
      {
        id: "outputs" as const,
        points: outputPoints,
        visible: showOutputs,
        color: OUTPUT_COLOR,
      },
    ],
    [inputPoints, outputPoints, showInputs, showOutputs]
  )

  const canConvert =
    !!input &&
    !!input.xCol &&
    !!input.yCol &&
    !!inputState.info &&
    !!outputState.info

  return (
    <div className="relative min-h-svh lg:h-svh lg:overflow-hidden">
      <div className="fixed inset-0">
        <MapView layers={layers} dark={theme.dark} />
      </div>
      <div className="fixed top-3 left-1/2 z-10 -translate-x-1/2">
        <ThemeToggle dark={theme.dark} onToggle={theme.toggle} />
      </div>
      {/* Below lg the cards stack under a map-sized gap; on lg they float over the map's sides. */}
      <div className="pointer-events-none relative flex flex-col gap-3 p-3 pt-[60svh] lg:h-full lg:flex-row lg:items-start lg:justify-between lg:pt-3 [&>*]:pointer-events-auto">
        <div className="lg:max-h-full lg:w-[340px]">
          <InputsCard
            epsg={inputEpsg}
            epsgState={inputState}
            onEpsgChange={(code) => {
              setInputEpsg(code)
              clearResult()
            }}
            data={input}
            onDataChange={(data) => {
              setInput(data)
              clearResult()
              if (!data) setShowInputs(false)
            }}
            showPoints={showInputs}
            onShowPointsChange={setShowInputs}
            pointCount={inputPoints.length}
          />
        </div>
        <div className="lg:max-h-full lg:w-[340px]">
          <OutputsCard
            epsg={outputEpsg}
            epsgState={outputState}
            onEpsgChange={(code) => {
              setOutputEpsg(code)
              clearResult()
            }}
            data={result?.output ?? null}
            skipped={result?.skipped ?? 0}
            showPoints={showOutputs}
            onShowPointsChange={setShowOutputs}
            pointCount={outputPoints.length}
            canConvert={canConvert}
            onConvert={() => {
              if (!input) return
              setResult(convertDataset(input, inputEpsg, outputEpsg))
              setShowOutputs(true)
            }}
          />
        </div>
      </div>
    </div>
  )
}
