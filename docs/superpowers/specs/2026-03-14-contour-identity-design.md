# Contour Identity — Design Spec

## Overview

A static single-page application that generates unique topographic contour-line wallpapers from a person's name, birth date, and birth time. The same inputs always produce the same output. Different people produce visibly distinct results.

No framework, no backend, no external dependencies. Pure HTML + CSS + JS served as static files.

## User Inputs

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Nome completo | text | yes | min 2 characters |
| Data de nascimento | date | yes | native date picker |
| Hora de nascimento | time | yes | native time picker |
| Resolucao | select | yes | dropdown with preset options |

Resolution options:
- 1920 x 1080 (Full HD)
- 2560 x 1440 (2K)
- 3840 x 2160 (4K)
- 1080 x 1920 (Mobile vertical)

## Output

A wallpaper image: white contour lines on dark background (#0a0a0a). Topographic style — continuous, closed or screen-crossing lines, densely organized, no fill between them. Downloadable as PNG.

## File Structure

```
index.html    — page structure and styles (<style> block)
app.js        — orchestration: form events, validation, download
noise.js      — simplex noise 2D implementation
contour.js    — marching squares + canvas line rendering
hash.js       — deterministic input-to-parameters conversion
```

All files at root level. ES modules via `<script type="module">`.

## Generation Pipeline

### Step 1: Hash inputs to parameters

Name + date + time are concatenated and passed through a deterministic hash function (FNV-1a or similar). From the hash, 8 normalized parameters (0–1) are derived, each from different bits of the hash:

| Parameter | Controls |
|-----------|----------|
| `density` | number of isolines (threshold count between field min and max) |
| `complexity` | number of noise octaves stacked |
| `focusX` | x-position of convergence point (0–1, mapped to canvas) |
| `focusY` | y-position of convergence point |
| `focusStrength` | how much the focus distorts the surrounding field |
| `angle` | overall rotation of the noise pattern |
| `scale` | noise zoom level (macro vs micro) |
| `lineWeight` | stroke thickness of contour lines |

Requirement: similar names must produce different results. The hash function must have good avalanche properties.

### Step 2: Generate scalar field

A 2D grid where each point receives a value from layered simplex noise. The noise is configured with the octaves and scale from the parameters. A radial distortion is applied around the focus point — field values are attracted/repelled from (focusX, focusY), creating a vortex-like convergence of contour lines.

The grid resolution matches the output resolution for the download canvas, and a scaled-down version for the preview canvas.

### Step 3: Extract contours (Marching Squares)

N thresholds are evenly spaced across the scalar field's value range (N controlled by `density`). For each threshold, marching squares traverses the grid and outputs line segments. These segments are the contour lines.

### Step 4: Render to canvas

Line segments are drawn on a `<canvas>` element:
- `strokeStyle`: white (#ffffff)
- Background: near-black (#0a0a0a)
- Line width: varies with `lineWeight` parameter
- Preview renders at screen-fitting size
- Download re-renders at the chosen resolution on an offscreen canvas

## Interface and UX

### Layout

Centered, minimal, dark background. Three vertical sections:
1. Form (top)
2. Canvas preview (middle, hidden until generated)
3. Download button (below canvas, hidden until generated)

### States

- **Initial**: form visible, canvas hidden, no download button
- **Generating**: button disabled, text changes to "Gerando..."
- **Ready**: canvas appears with preview, "Baixar PNG" button appears

### Download

Filename format: `contour-<firstname>.png` where firstname is the first word of the name input, lowercased.

## Palette

MVP: black and white only (white lines on #0a0a0a background).

## Determinism

The entire pipeline is deterministic. No `Math.random()` anywhere. The simplex noise implementation must accept a seed. The hash function must be pure. Same inputs = same image, always, across browsers.

## Distinctiveness

The parameter derivation must ensure that two different people produce visibly distinct wallpapers. This is achieved by:
1. Using a hash with good avalanche properties (small input change = large hash change)
2. Deriving each parameter from independent bits of the hash
3. Parameters controlling visually impactful dimensions (scale, focus position, density)
