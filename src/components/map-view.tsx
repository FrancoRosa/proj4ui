import type { FeatureCollection, Point as GeoPoint } from "geojson"
import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import type { Point } from "@/lib/convert"

export const INPUT_COLOR = "#3b82f6"
export const OUTPUT_COLOR = "#84cc16"

const TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN

interface Layer {
  id: "inputs" | "outputs"
  points: Point[]
  visible: boolean
  color: string
}

function toGeoJson(points: Point[]): FeatureCollection<GeoPoint> {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { row: JSON.stringify(p.row) },
    })),
  }
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function popupHtml(rowJson: string) {
  const row = JSON.parse(rowJson) as Record<string, string>
  const lines = Object.entries(row)
    .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join("")
  return `<table class="map-popup">${lines}</table>`
}

const STYLES = {
  light: "mapbox://styles/mapbox/streets-v12",
  dark: "mapbox://styles/mapbox/dark-v11",
}

// Keeps fitted points out from under the floating cards (340px wide on lg, stacked below otherwise).
function fitPadding() {
  if (window.matchMedia("(min-width: 1024px)").matches) {
    return { top: 70, bottom: 40, left: 390, right: 390 }
  }
  return { top: 70, bottom: window.innerHeight * 0.4 + 20, left: 40, right: 40 }
}

function addPointLayers(map: mapboxgl.Map) {
  for (const id of ["inputs", "outputs"]) {
    if (map.getSource(id)) continue
    map.addSource(id, { type: "geojson", data: toGeoJson([]) })
    map.addLayer({
      id,
      type: "circle",
      source: id,
      paint: {
        "circle-radius": 6,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#ffffff",
      },
    })
  }
}

export function MapView({ layers, dark }: { layers: Layer[]; dark: boolean }) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const styleRef = useRef(dark ? STYLES.dark : STYLES.light)
  // Bumped on every style load, since switching styles drops our sources and layers.
  const [styleVersion, setStyleVersion] = useState(0)
  const ready = styleVersion > 0

  useEffect(() => {
    if (!TOKEN || !container.current) return
    mapboxgl.accessToken = TOKEN
    const map = new mapboxgl.Map({
      container: container.current,
      style: styleRef.current,
      center: [0, 20],
      zoom: 1.5,
    })
    map.addControl(new mapboxgl.NavigationControl(), "top-right")
    map.on("style.load", () => {
      addPointLayers(map)
      setStyleVersion((v) => v + 1)
    })
    for (const id of ["inputs", "outputs"]) {
      map.on("click", id, (e) => {
        const feature = e.features?.[0]
        if (!feature || feature.geometry.type !== "Point") return
        new mapboxgl.Popup()
          .setLngLat(feature.geometry.coordinates as [number, number])
          .setHTML(popupHtml(feature.properties?.row ?? "{}"))
          .addTo(map)
      })
      map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"))
      map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""))
    }
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Follow the app theme.
  useEffect(() => {
    const style = dark ? STYLES.dark : STYLES.light
    if (!mapRef.current || styleRef.current === style) return
    styleRef.current = style
    mapRef.current.setStyle(style)
  }, [dark])

  // Sync point data, colors and visibility.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    for (const layer of layers) {
      const source = map.getSource(layer.id) as mapboxgl.GeoJSONSource | undefined
      // Mid style switch; style.load will re-run this.
      if (!source) continue
      source.setData(toGeoJson(layer.points))
      map.setPaintProperty(layer.id, "circle-color", layer.color)
      map.setLayoutProperty(layer.id, "visibility", layer.visible ? "visible" : "none")
    }
  }, [layers, ready, styleVersion])

  // Fit the view to whatever is shown, whenever that set changes.
  useEffect(() => {
    const map = mapRef.current
    const shown = layers.filter((l) => l.visible).flatMap((l) => l.points)
    if (!map || !ready || shown.length === 0) return
    const bounds = new mapboxgl.LngLatBounds()
    for (const p of shown) bounds.extend([p.lng, p.lat])
    map.fitBounds(bounds, { padding: fitPadding(), maxZoom: 16, duration: 800 })
  }, [layers, ready])

  if (!TOKEN) {
    return (
      <div className="flex h-full items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">
        Set PUBLIC_MAPBOX_TOKEN in .env to display the map.
      </div>
    )
  }
  return <div ref={container} className="h-full w-full" />
}
