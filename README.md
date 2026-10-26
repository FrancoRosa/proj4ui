# proj4ui

Tool to convert coordinates from any EPSG code (default: EPSG:4326, lat/lng) to any other EPSG code (projection), and to check the results visually on a map.

## Features

1. Select any EPSG code (from [epsg.io](https://epsg.io)) as input and as output. The UI displays the name of the selected EPSG, and the code can also be picked from a dropdown.
2. Convert a single coordinate or a CSV file. For a CSV file, select the x column and the y column (the first row is the header), preview the data and download the converted CSV.
3. Display the input points and the output points on a Mapbox map, so we can visually verify where the points are actually located.

## UI specification

### Layout

The Mapbox map fills the whole screen. The **Inputs** card floats over its left side and the **Outputs** card over its right side, and a light / dark mode toggle sits at the top center.

```
┌────────────────────────────────────────────────────────────────┐
│ ┌────────────┐               [☾]                ┌────────────┐ │
│ │ INPUTS     │                                  │ OUTPUTS    │ │
│ │ [EPSG ▾]   │                                  │ [EPSG ▾]   │ │
│ │ EPSG name  │                                  │ EPSG name  │ │
│ │ [Upload]   │                                  │ preview    │ │
│ │ x col [▾]  │          MAPBOX MAP              │ [Show pts] │ │
│ │ y col [▾]  │        (full screen)             │ [Convert]  │ │
│ │ preview    │                                  │ [Download] │ │
│ │ [Show pts] │                                  └────────────┘ │
│ └────────────┘                                                 │
└────────────────────────────────────────────────────────────────┘
```

- The cards are 340px wide, as tall as their content, and have an 80% opaque, blurred background so the map shows through.
- On narrow screens the map stays full screen and the cards stack below a map-sized gap.
- The theme toggle switches the app and the basemap (Mapbox Streets / Dark). The choice is remembered, and defaults to the system setting.

### Shared card elements

Both cards contain:

| Element | Behavior |
| --- | --- |
| **EPSG selector** | Combobox to search EPSG codes by code or name (e.g. "utm 18s peru"). Built-in common codes and previously picked codes (remembered in the browser) are matched instantly; with `PUBLIC_MAPTILER_KEY` set, the query is also sent to the MapTiler Coordinates API (the search behind epsg.io) after a short pause, so every EPSG projected / geographic CRS can be found. Without the key, typing a code number that isn't in the list (4+ digits) looks it up on epsg.io instead. Shows the full name of the selected EPSG below the selector. Definitions come from the search result or from epsg.io (`https://epsg.io/<code>.proj4`, name from `https://epsg.io/<code>.json`) and are registered with proj4. Default: `EPSG:4326` for inputs. |
| **Show points button** | Toggles the card's points on the map (input points on the Inputs card, output points on the Outputs card). When turned on, the map fits its bounds to those points. Disabled when the card has no points. |
| **Data preview** | Table with the first rows of the card's data. |

### Inputs card (left)

| Element | Behavior |
| --- | --- |
| **Upload button** | Opens a file picker for a `.csv` file. The file is parsed with PapaParse, using the first row as the header. |
| **X / Y column selectors** | Dropdowns listing the CSV headers, to choose which column holds x (lng / easting) and which holds y (lat / northing). Shown after a file is uploaded. |
| **Single coordinate** | Optional x / y text fields to convert one coordinate without a file. |

### Outputs card (right)

| Element | Behavior |
| --- | --- |
| **EPSG selector** | Target projection for the conversion. Changing it after a conversion clears the outputs until Convert is pressed again. |
| **Convert button** | Converts every row from the input EPSG to the output EPSG with proj4 and fills the Outputs card. Disabled until an input EPSG, an output EPSG and the x / y columns (or a single coordinate) are set. |
| **Download button** | Downloads the converted data as a CSV: all the original columns plus the converted x / y columns. Disabled until a conversion has run. |

### Map

- Mapbox GL map; the access token is read from the `PUBLIC_MAPBOX_TOKEN` environment variable.
- Both keys are public (bundled into the page), so restrict them to the app's origins in the Mapbox and MapTiler dashboards.
- Input points and output points use different colors, matching each card's accent color.
- Points are always drawn in WGS84 (EPSG:4326), so the coordinates of each card are reprojected to EPSG:4326 for display only.
- Clicking a point shows a popup with the row's values.

### Errors

- An unknown EPSG code, or a failed lookup on epsg.io, shows an error under the selector.
- Rows with non-numeric x / y values are skipped during conversion, and the number of skipped rows is shown in the Outputs card.

## Development

Astro + React + TypeScript + shadcn/ui, with proj4, PapaParse and Mapbox GL.

```bash
pnpm install
cp .env.example .env.local   # then fill in PUBLIC_MAPBOX_TOKEN and PUBLIC_MAPTILER_KEY
pnpm dev
```

### Adding components

To add shadcn/ui components, run:

```bash
npx shadcn@latest add button
```

This places the UI components in the `src/components` directory. Import them with:

```tsx
import { Button } from "@/components/ui/button"
```
