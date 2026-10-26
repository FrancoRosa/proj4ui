# proj4ui

Tool to convert coordinates from any EPSG code (default: EPSG:4326, lat/lng) to any other EPSG code (projection), and to check the results visually on a map.

## Features

1. Select any EPSG code (from [epsg.io](https://epsg.io)) as input and as output. The UI displays the name of the selected EPSG, and the code can also be picked from a dropdown.
2. Convert a single coordinate or a CSV file. For a CSV file, select the x column and the y column (the first row is the header), preview the data and download the converted CSV.
3. Display the input points and the output points on a Mapbox map, so we can visually verify where the points are actually located.

## UI specification

### Layout

The screen is split into three columns: the **Inputs** card on the left, the Mapbox map in the center, and the **Outputs** card on the right.

```
┌──────────────┬──────────────────────────────────┬──────────────┐
│  INPUTS      │                                  │  OUTPUTS     │
│              │                                  │              │
│  [EPSG ▾]    │                                  │  [EPSG ▾]    │
│  EPSG name   │                                  │  EPSG name   │
│              │            MAPBOX MAP            │              │
│  [Upload]    │                                  │              │
│  x col [▾]   │                                  │              │
│  y col [▾]   │                                  │              │
│  preview     │                                  │  preview     │
│              │                                  │              │
│  [Show pts]  │                                  │  [Show pts]  │
│  [Convert]   │                                  │  [Download]  │
└──────────────┴──────────────────────────────────┴──────────────┘
```

- The map fills the center column and the full height of the screen.
- Both cards have the same width and sit on either side of the map.

### Shared card elements

Both cards contain:

| Element | Behavior |
| --- | --- |
| **EPSG selector** | Combobox where the user can type an EPSG code or search by name, or pick from a dropdown. Shows the full name of the selected EPSG below the selector. The definition is fetched from epsg.io (`https://epsg.io/<code>.proj4`) and registered with proj4. Default: `EPSG:4326` for inputs. |
| **Show points button** | Toggles the card's points on the map (input points on the Inputs card, output points on the Outputs card). When turned on, the map fits its bounds to those points. Disabled when the card has no points. |
| **Data preview** | Table with the first rows of the card's data. |

### Inputs card (left)

| Element | Behavior |
| --- | --- |
| **Upload button** | Opens a file picker for a `.csv` file. The file is parsed with PapaParse, using the first row as the header. |
| **X / Y column selectors** | Dropdowns listing the CSV headers, to choose which column holds x (lng / easting) and which holds y (lat / northing). Shown after a file is uploaded. |
| **Single coordinate** | Optional x / y text fields to convert one coordinate without a file. |
| **Convert button** | Converts every row from the input EPSG to the output EPSG with proj4 and fills the Outputs card. Disabled until an input EPSG, an output EPSG and the x / y columns (or a single coordinate) are set. |

### Outputs card (right)

| Element | Behavior |
| --- | --- |
| **EPSG selector** | Target projection for the conversion. Changing it after a conversion clears the outputs until Convert is pressed again. |
| **Download button** | Downloads the converted data as a CSV: all the original columns plus the converted x / y columns. Disabled until a conversion has run. |

### Map (center)

- Mapbox GL map; the access token is read from the `PUBLIC_MAPBOX_TOKEN` environment variable.
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
echo "PUBLIC_MAPBOX_TOKEN=<your token>" > .env
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
