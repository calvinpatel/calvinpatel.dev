# cell-web/1

One JSON file describes one neuron, flattened to 2D and ready to draw. `scripts/swc_to_web.py` writes these files today; Dendrometer's export will write them later. The site's hero reads them and doesn't care which tool made them.

## Coordinates

- The soma is at (0, 0).
- The point farthest from the soma is at distance 1. Everything is scaled to that, so the site can draw a cell at any size by multiplying.
- y points down, matching how browsers draw. "Up" on screen is negative y.
- The view is the plane where the arbor spreads out most (PCA), turned so the apical dendrite points up. Cells with no apical dendrite are turned so the axon points down.
- Each of that plane's two axes points toward the point farthest from the soma along it, set before the turn, so the same cell always comes out the same way, on any machine and in any 3D orientation.

## Fields

| Field | Type | Meaning |
| --- | --- | --- |
| `format` | string | Always `"cell-web/1"`. |
| `id` | string | Lowercase name from the file name, used as the JSON file name. |
| `cellType` | string | From the sources CSV, e.g. `"medium spiny"`. |
| `projection` | string | `"pca"` or `"xy"`. |
| `source` | object | `name`, `archive`, `repository`, `url`, `license` for the original reconstruction. |
| `credit` | string | The credit line to show on the site. |
| `counts` | object | `input` (points in the SWC file) and `output` (points in this file). |
| `stats` | object | `maxDendDist` and `maxAxonDist`: the largest `dist` value among dendrite and axon points. |
| `x`, `y` | number[] | Point positions. |
| `r` | number[] | Point radii, on the same scale as `x` and `y`. |
| `parent` | int[] | Index of each point's parent point. |
| `kind` | int[] | 1 soma, 2 axon, 3 basal dendrite, 4 apical dendrite. |
| `dist` | number[] | Distance from the soma along the branches. |

`x`, `y`, `r`, `parent`, `kind`, and `dist` always have the same length.

## Rules every file follows

1. Point 0 is the soma: `kind[0]` is 1, `parent[0]` is -1, and `x[0]`, `y[0]`, and `dist[0]` are 0.
2. Every other point's parent comes before it: `0 <= parent[i] < i`. One pass through the arrays in order is enough to walk the whole tree.
3. Only point 0 has kind 1. Unusual type codes in the source file become 3.
4. `dist[i]` equals `dist[parent[i]]` plus the straight-line distance between the two points.
5. The farthest point from the soma is at distance 1.
6. Numbers are rounded to 4 decimal places.

`dist` is measured in the flattened 2D shape. It times the animation, so it matches what's drawn. It is not a scientific path length, which would be measured in 3D and in micrometers.

## The index file

`index.json`, next to the cell files, lists every cell the site can load:

```json
{
  "format": "cell-web-index/1",
  "cells": [
    { "id": "...", "file": "....json", "cellType": "...", "credit": "...", "url": "..." }
  ]
}
```

## The sources CSV

Every SWC file needs a row before it will convert. Required columns: `file`, `name`, `cell_type`, `archive`, `url`. Optional: `repository` (default `NeuroMorpho.Org`) and `license` (default `CC BY 4.0`).

```csv
file,name,cell_type,archive,url
example.CNG.swc,example-neuron,medium spiny,Example Lab,https://neuromorpho.org/neuron_info.jsp?neuron_name=example-neuron
```

## Versions

Adding an optional field keeps the format at `cell-web/1`. Renaming or removing a field, or changing what one means, makes it `cell-web/2`. Changes are recorded in the changelog, not in this file.
