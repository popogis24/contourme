# Contour Identity Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static single-page app that generates unique topographic contour-line wallpapers from name + birth date + birth time.

**Architecture:** Five ES modules at the root: `hash.js` (input→parameters), `noise.js` (seeded simplex noise 2D), `contour.js` (marching squares + rendering), `app.js` (orchestration), and `index.html` (structure + styles). No frameworks, no bundler, no external dependencies. Pure logic modules are tested with Node.js using `node --test`.

**Tech Stack:** Vanilla JS (ES modules), Canvas 2D API, HTML5 native form inputs, Node.js built-in test runner for unit tests.

---

## File Map

| File | Responsibility |
|------|---------------|
| `hash.js` | FNV-1a hash, parameter derivation (8 floats from input string) |
| `noise.js` | Seeded 2D simplex noise with octave layering |
| `contour.js` | Scalar field generation, marching squares, canvas rendering |
| `app.js` | Form handling, validation, download, UI state management |
| `index.html` | Page structure, `<style>` block, `<canvas>`, module script entry |
| `tests/hash.test.js` | Tests for hash determinism, avalanche, parameter ranges |
| `tests/noise.test.js` | Tests for noise determinism, value range, seed sensitivity |
| `tests/contour.test.js` | Tests for marching squares segment extraction |

---

## Chunk 1: Core Logic

### Task 1: Hash Module

**Files:**
- Create: `hash.js`
- Create: `tests/hash.test.js`

- [ ] **Step 1: Write failing tests for hash module**

Create `tests/hash.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashInputs, deriveParams } from '../hash.js';

describe('hashInputs', () => {
  it('returns a 32-bit unsigned integer', () => {
    const h = hashInputs('Alice', '1990-05-15', '14:30');
    assert.equal(typeof h, 'number');
    assert.ok(h >= 0 && h <= 0xFFFFFFFF);
  });

  it('is deterministic', () => {
    const a = hashInputs('Alice', '1990-05-15', '14:30');
    const b = hashInputs('Alice', '1990-05-15', '14:30');
    assert.equal(a, b);
  });

  it('differs for different names', () => {
    const a = hashInputs('Alice', '1990-05-15', '14:30');
    const b = hashInputs('Bob', '1990-05-15', '14:30');
    assert.notEqual(a, b);
  });

  it('differs for different dates', () => {
    const a = hashInputs('Alice', '1990-05-15', '14:30');
    const b = hashInputs('Alice', '1990-05-16', '14:30');
    assert.notEqual(a, b);
  });

  it('differs for different times', () => {
    const a = hashInputs('Alice', '1990-05-15', '14:30');
    const b = hashInputs('Alice', '1990-05-15', '14:31');
    assert.notEqual(a, b);
  });
});

describe('deriveParams', () => {
  it('returns object with all 8 parameters', () => {
    const p = deriveParams('Alice', '1990-05-15', '14:30');
    const keys = ['density', 'complexity', 'focusX', 'focusY',
                  'focusStrength', 'angle', 'scale', 'lineWeight'];
    for (const k of keys) {
      assert.ok(k in p, `missing param: ${k}`);
    }
  });

  it('all parameters are in [0, 1]', () => {
    const p = deriveParams('Alice', '1990-05-15', '14:30');
    for (const [k, v] of Object.entries(p)) {
      assert.ok(v >= 0 && v <= 1, `${k} = ${v} out of range`);
    }
  });

  it('is deterministic', () => {
    const a = deriveParams('Alice', '1990-05-15', '14:30');
    const b = deriveParams('Alice', '1990-05-15', '14:30');
    assert.deepEqual(a, b);
  });

  it('produces different params for different inputs', () => {
    const a = deriveParams('Alice', '1990-05-15', '14:30');
    const b = deriveParams('Bob', '1985-12-01', '08:00');
    const keys = Object.keys(a);
    const diffs = keys.filter(k => a[k] !== b[k]);
    assert.ok(diffs.length >= 5, `only ${diffs.length} params differ`);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/hash.test.js`
Expected: FAIL — cannot find module `../hash.js`

- [ ] **Step 3: Implement hash.js**

Create `hash.js`:

```js
/**
 * FNV-1a hash — good avalanche properties, simple, deterministic.
 * Operates on a string, returns a 32-bit unsigned integer.
 */
function fnv1a(str) {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return hash >>> 0; // ensure unsigned
}

/**
 * Generate multiple independent hash values by rehashing with suffixes.
 * Returns an array of N 32-bit unsigned integers.
 */
function multiHash(str, count) {
  const hashes = [];
  for (let i = 0; i < count; i++) {
    hashes.push(fnv1a(str + '\x00' + i));
  }
  return hashes;
}

/**
 * Hash the three user inputs into a single 32-bit value.
 */
export function hashInputs(name, date, time) {
  return fnv1a(name.trim().toLowerCase() + '|' + date + '|' + time);
}

/**
 * Derive 8 normalized [0,1] parameters from user inputs.
 * Each parameter uses an independent hash to avoid correlation.
 */
export function deriveParams(name, date, time) {
  const key = name.trim().toLowerCase() + '|' + date + '|' + time;
  const hashes = multiHash(key, 8);
  const norm = (h) => h / 0xFFFFFFFF;

  return {
    density:       norm(hashes[0]),
    complexity:    norm(hashes[1]),
    focusX:        norm(hashes[2]),
    focusY:        norm(hashes[3]),
    focusStrength: norm(hashes[4]),
    angle:         norm(hashes[5]),
    scale:         norm(hashes[6]),
    lineWeight:    norm(hashes[7]),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/hash.test.js`
Expected: all 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add hash.js tests/hash.test.js
git commit -m "feat: add hash module with FNV-1a and parameter derivation"
```

---

### Task 2: Noise Module

**Files:**
- Create: `noise.js`
- Create: `tests/noise.test.js`

- [ ] **Step 1: Write failing tests for noise module**

Create `tests/noise.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createNoise2D } from '../noise.js';

describe('createNoise2D', () => {
  it('returns a function', () => {
    const noise = createNoise2D(42);
    assert.equal(typeof noise, 'function');
  });

  it('returns values in [-1, 1]', () => {
    const noise = createNoise2D(42);
    for (let i = 0; i < 1000; i++) {
      const v = noise(i * 0.1, i * 0.07);
      assert.ok(v >= -1 && v <= 1, `value ${v} out of range at (${i * 0.1}, ${i * 0.07})`);
    }
  });

  it('is deterministic with same seed', () => {
    const a = createNoise2D(42);
    const b = createNoise2D(42);
    for (let i = 0; i < 100; i++) {
      assert.equal(a(i * 0.1, i * 0.2), b(i * 0.1, i * 0.2));
    }
  });

  it('differs with different seeds', () => {
    const a = createNoise2D(42);
    const b = createNoise2D(99);
    let diffs = 0;
    for (let i = 0; i < 100; i++) {
      if (a(i * 0.1, i * 0.2) !== b(i * 0.1, i * 0.2)) diffs++;
    }
    assert.ok(diffs > 90, `only ${diffs}/100 values differ`);
  });

  it('varies spatially (not constant)', () => {
    const noise = createNoise2D(42);
    const values = new Set();
    for (let i = 0; i < 100; i++) {
      values.add(noise(i * 0.5, i * 0.3).toFixed(4));
    }
    assert.ok(values.size > 50, `only ${values.size} unique values`);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/noise.test.js`
Expected: FAIL — cannot find module `../noise.js`

- [ ] **Step 3: Implement noise.js**

Create `noise.js` — a seeded 2D simplex noise implementation. The implementation must:
- Accept a numeric seed in `createNoise2D(seed)`
- Use the seed to build a deterministic permutation table (shuffle a 0-255 array using a seeded PRNG, e.g., xorshift32)
- Implement the standard simplex noise 2D algorithm (skew input space to triangular grid, determine simplex, compute gradient contributions)
- Return values in [-1, 1]

The full simplex noise algorithm is ~120 lines. Key structure:

```js
// Gradient vectors for 2D
const GRAD2 = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];

function buildPermTable(seed) {
  // Create array [0..255], shuffle with seeded xorshift32
  // Double the table (perm[i] = perm[i+256]) for wrapping
}

export function createNoise2D(seed) {
  const perm = buildPermTable(seed);

  return function noise2D(x, y) {
    // Standard simplex noise 2D:
    // 1. Skew (x,y) to determine simplex cell
    // 2. Determine which triangle (simplex) we're in
    // 3. Calculate 3 corner contributions using gradient dot products
    // 4. Sum and scale to [-1, 1]
  };
}
```

Write the full, correct simplex noise 2D implementation. Reference: Stefan Gustavson's simplex noise paper. Do NOT use `Math.random()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/noise.test.js`
Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add noise.js tests/noise.test.js
git commit -m "feat: add seeded 2D simplex noise module"
```

---

### Task 3: Contour Module

**Files:**
- Create: `contour.js`
- Create: `tests/contour.test.js`

- [ ] **Step 1: Write failing tests for contour module**

Create `tests/contour.test.js`:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateField, extractContours } from '../contour.js';

describe('generateField', () => {
  it('returns a Float64Array of width * height', () => {
    const params = {
      density: 0.5, complexity: 0.5, focusX: 0.5, focusY: 0.5,
      focusStrength: 0.5, angle: 0.0, scale: 0.5, lineWeight: 0.5,
    };
    const field = generateField(100, 80, params, 42);
    assert.ok(field instanceof Float64Array);
    assert.equal(field.length, 100 * 80);
  });

  it('is deterministic', () => {
    const params = {
      density: 0.5, complexity: 0.5, focusX: 0.5, focusY: 0.5,
      focusStrength: 0.5, angle: 0.0, scale: 0.5, lineWeight: 0.5,
    };
    const a = generateField(50, 50, params, 42);
    const b = generateField(50, 50, params, 42);
    assert.deepEqual(a, b);
  });

  it('varies with different seeds', () => {
    const params = {
      density: 0.5, complexity: 0.5, focusX: 0.5, focusY: 0.5,
      focusStrength: 0.5, angle: 0.0, scale: 0.5, lineWeight: 0.5,
    };
    const a = generateField(50, 50, params, 42);
    const b = generateField(50, 50, params, 99);
    let diffs = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) diffs++;
    }
    assert.ok(diffs > a.length * 0.9);
  });
});

describe('extractContours', () => {
  it('returns an array of line segments', () => {
    // Simple 3x3 field with a clear threshold crossing
    const field = new Float64Array([
      0, 0, 0,
      0, 1, 0,
      0, 0, 0,
    ]);
    const segments = extractContours(field, 3, 3, [0.5]);
    assert.ok(Array.isArray(segments));
    assert.ok(segments.length > 0);
    // Each segment is { x1, y1, x2, y2 }
    for (const seg of segments) {
      assert.ok('x1' in seg && 'y1' in seg && 'x2' in seg && 'y2' in seg);
    }
  });

  it('returns empty for uniform field', () => {
    const field = new Float64Array([1, 1, 1, 1]);
    const segments = extractContours(field, 2, 2, [0.5]);
    assert.equal(segments.length, 0);
  });

  it('more thresholds = more segments', () => {
    const field = new Float64Array([
      0, 0.25, 0.5, 0.75, 1,
      0, 0.25, 0.5, 0.75, 1,
      0, 0.25, 0.5, 0.75, 1,
    ]);
    const few = extractContours(field, 5, 3, [0.5]);
    const many = extractContours(field, 5, 3, [0.1, 0.3, 0.5, 0.7, 0.9]);
    assert.ok(many.length > few.length);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/contour.test.js`
Expected: FAIL — cannot find module `../contour.js`

- [ ] **Step 3: Implement contour.js**

Create `contour.js` with three exported functions:

```js
import { createNoise2D } from './noise.js';

/**
 * Generate a 2D scalar field using layered simplex noise.
 *
 * @param {number} width - grid width
 * @param {number} height - grid height
 * @param {object} params - the 8 derived parameters
 * @param {number} seed - numeric seed for noise
 * @returns {Float64Array} field values, row-major
 */
export function generateField(width, height, params, seed) {
  const noise = createNoise2D(seed);
  const field = new Float64Array(width * height);

  // Map params to usable ranges
  const octaves = Math.floor(params.complexity * 5) + 1;  // 1-6
  const baseScale = 0.002 + params.scale * 0.008;         // 0.002-0.01
  const fxPx = params.focusX * width;
  const fyPx = params.focusY * height;
  const fStr = params.focusStrength * 0.5;                 // 0-0.5
  const cosA = Math.cos(params.angle * Math.PI * 2);
  const sinA = Math.sin(params.angle * Math.PI * 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Apply rotation
      const rx = (x - width / 2) * cosA - (y - height / 2) * sinA + width / 2;
      const ry = (x - width / 2) * sinA + (y - height / 2) * cosA + height / 2;

      // Apply focus distortion
      const dx = rx - fxPx;
      const dy = ry - fyPx;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.sqrt(width * width + height * height);
      const distortion = fStr * (1 - dist / maxDist);
      const fx = rx + dx * distortion;
      const fy = ry + dy * distortion;

      // Layer octaves
      let value = 0;
      let amplitude = 1;
      let frequency = baseScale;
      let maxAmp = 0;
      for (let o = 0; o < octaves; o++) {
        value += noise(fx * frequency, fy * frequency) * amplitude;
        maxAmp += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }
      field[y * width + x] = value / maxAmp; // normalize to [-1, 1]
    }
  }
  return field;
}

/**
 * Extract contour line segments using marching squares.
 *
 * @param {Float64Array} field - scalar field, row-major
 * @param {number} width - field width
 * @param {number} height - field height
 * @param {number[]} thresholds - iso-values to extract
 * @returns {Array<{x1,y1,x2,y2}>} line segments
 */
export function extractContours(field, width, height, thresholds) {
  const segments = [];

  for (const threshold of thresholds) {
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        // Four corners: top-left, top-right, bottom-right, bottom-left
        const tl = field[y * width + x];
        const tr = field[y * width + x + 1];
        const br = field[(y + 1) * width + x + 1];
        const bl = field[(y + 1) * width + x];

        // Build case index (4-bit)
        const caseIndex =
          (tl >= threshold ? 8 : 0) |
          (tr >= threshold ? 4 : 0) |
          (br >= threshold ? 2 : 0) |
          (bl >= threshold ? 1 : 0);

        if (caseIndex === 0 || caseIndex === 15) continue;

        // Linear interpolation helpers
        const lerp = (a, b, va, vb) => {
          const t = (threshold - va) / (vb - va);
          return a + t * (b - a);
        };

        // Edge midpoints (interpolated)
        const top    = { x: lerp(x, x + 1, tl, tr), y };
        const right  = { x: x + 1, y: lerp(y, y + 1, tr, br) };
        const bottom = { x: lerp(x, x + 1, bl, br), y: y + 1 };
        const left   = { x, y: lerp(y, y + 1, tl, bl) };

        // Marching squares lookup — 16 cases → line segments
        // Each case maps to 0, 1, or 2 segments
        const addSeg = (a, b) => segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });

        switch (caseIndex) {
          case 1: case 14: addSeg(left, bottom); break;
          case 2: case 13: addSeg(bottom, right); break;
          case 3: case 12: addSeg(left, right); break;
          case 4: case 11: addSeg(top, right); break;
          case 5:  addSeg(left, top); addSeg(bottom, right); break;
          case 6: case 9:  addSeg(top, bottom); break;
          case 7: case 8:  addSeg(left, top); break;
          case 10: addSeg(top, right); addSeg(left, bottom); break;
        }
      }
    }
  }
  return segments;
}

/**
 * Render contour segments onto a canvas 2D context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{x1,y1,x2,y2}>} segments
 * @param {number} fieldWidth - width of the field grid
 * @param {number} fieldHeight - height of the field grid
 * @param {number} canvasWidth - pixel width of the canvas
 * @param {number} canvasHeight - pixel height of the canvas
 * @param {number} lineWeight - 0-1 normalized line weight
 */
export function renderContours(ctx, segments, fieldWidth, fieldHeight, canvasWidth, canvasHeight, lineWeight) {
  const scaleX = canvasWidth / fieldWidth;
  const scaleY = canvasHeight / fieldHeight;
  const lw = 0.5 + lineWeight * 2; // 0.5px - 2.5px

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (const seg of segments) {
    ctx.moveTo(seg.x1 * scaleX, seg.y1 * scaleY);
    ctx.lineTo(seg.x2 * scaleX, seg.y2 * scaleY);
  }
  ctx.stroke();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/contour.test.js`
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add contour.js tests/contour.test.js
git commit -m "feat: add contour module with scalar field, marching squares, and rendering"
```

---

## Chunk 2: UI and Integration

### Task 4: HTML Page and Styles

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contour Identity</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 300;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin-bottom: 2rem;
      color: #ffffff;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
      max-width: 360px;
      margin-bottom: 2rem;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.85rem;
      color: #999;
    }
    input, select {
      padding: 0.6rem 0.8rem;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 4px;
      color: #e0e0e0;
      font-size: 1rem;
    }
    input:focus, select:focus {
      outline: none;
      border-color: #555;
    }
    button {
      padding: 0.7rem;
      background: #ffffff;
      color: #0a0a0a;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    #preview-container {
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      width: 100%;
      max-width: 960px;
    }
    #preview-container.visible { display: flex; }
    #preview {
      width: 100%;
      height: auto;
      border: 1px solid #222;
    }
    #download-btn {
      background: transparent;
      color: #ffffff;
      border: 1px solid #444;
      font-weight: 400;
    }
  </style>
</head>
<body>
  <h1>Contour Identity</h1>
  <form id="form">
    <label>
      Nome completo
      <input type="text" id="name" required minlength="2" autocomplete="name">
    </label>
    <label>
      Data de nascimento
      <input type="date" id="birthdate" required>
    </label>
    <label>
      Hora de nascimento
      <input type="time" id="birthtime" required>
    </label>
    <label>
      Resolucao
      <select id="resolution">
        <option value="1920x1080">1920 x 1080 (Full HD)</option>
        <option value="2560x1440">2560 x 1440 (2K)</option>
        <option value="3840x2160">3840 x 2160 (4K)</option>
        <option value="1080x1920">1080 x 1920 (Mobile)</option>
      </select>
    </label>
    <button type="submit" id="generate-btn">Gerar</button>
  </form>
  <div id="preview-container">
    <canvas id="preview"></canvas>
    <button id="download-btn">Baixar PNG</button>
  </div>
  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Open in browser to verify layout**

Run: `python3 -m http.server 8000` (from project root), open `http://localhost:8000`. Verify the form renders correctly on a dark background, fields are usable, and the canvas area is hidden.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add HTML page with form and styles"
```

---

### Task 5: App Module (Orchestration)

**Files:**
- Create: `app.js`

- [ ] **Step 1: Implement app.js**

```js
import { hashInputs, deriveParams } from './hash.js';
import { generateField, extractContours, renderContours } from './contour.js';

const form = document.getElementById('form');
const generateBtn = document.getElementById('generate-btn');
const previewContainer = document.getElementById('preview-container');
const previewCanvas = document.getElementById('preview');
const downloadBtn = document.getElementById('download-btn');

// State for download
let currentParams = null;
let currentSeed = 0;
let currentResolution = { w: 1920, h: 1080 };
let currentFirstName = '';

function parseResolution(value) {
  const [w, h] = value.split('x').map(Number);
  return { w, h };
}

function generate(name, date, time, resolution) {
  const seed = hashInputs(name, date, time);
  const params = deriveParams(name, date, time);
  const { w, h } = parseResolution(resolution);

  // Store for download
  currentParams = params;
  currentSeed = seed;
  currentResolution = { w, h };
  currentFirstName = name.trim().split(/\s+/)[0].toLowerCase();

  // Preview: render at a scaled-down size that fits the screen
  const maxPreviewWidth = Math.min(960, window.innerWidth - 32);
  const aspect = h / w;
  const previewW = maxPreviewWidth;
  const previewH = Math.round(maxPreviewWidth * aspect);

  previewCanvas.width = previewW;
  previewCanvas.height = previewH;

  // Use a smaller field grid for preview (performance)
  const fieldW = Math.min(w, 600);
  const fieldH = Math.round(fieldW * aspect);

  const field = generateField(fieldW, fieldH, params, seed);

  // Compute thresholds from density
  const numLines = Math.floor(10 + params.density * 40); // 10-50 lines
  const min = Math.min(...field);
  const max = Math.max(...field);
  const thresholds = [];
  for (let i = 1; i <= numLines; i++) {
    thresholds.push(min + (max - min) * (i / (numLines + 1)));
  }

  const segments = extractContours(field, fieldW, fieldH, thresholds);
  const ctx = previewCanvas.getContext('2d');
  renderContours(ctx, segments, fieldW, fieldH, previewW, previewH, params.lineWeight);

  previewContainer.classList.add('visible');
}

function downloadFullRes() {
  if (!currentParams) return;

  const { w, h } = currentResolution;
  const aspect = h / w;

  // Full resolution field
  const field = generateField(w, h, currentParams, currentSeed);

  const numLines = Math.floor(10 + currentParams.density * 40);
  const min = Math.min(...field);
  const max = Math.max(...field);
  const thresholds = [];
  for (let i = 1; i <= numLines; i++) {
    thresholds.push(min + (max - min) * (i / (numLines + 1)));
  }

  const segments = extractContours(field, w, h, thresholds);

  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d');
  renderContours(ctx, segments, w, h, w, h, currentParams.lineWeight);

  // Trigger download
  const link = document.createElement('a');
  link.download = `contour-${currentFirstName}.png`;
  link.href = offscreen.toDataURL('image/png');
  link.click();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const date = document.getElementById('birthdate').value;
  const time = document.getElementById('birthtime').value;
  const resolution = document.getElementById('resolution').value;

  if (name.trim().length < 2) return;

  generateBtn.disabled = true;
  generateBtn.textContent = 'Gerando...';

  // Use requestAnimationFrame to let the UI update before heavy computation
  requestAnimationFrame(() => {
    setTimeout(() => {
      generate(name, date, time, resolution);
      generateBtn.disabled = false;
      generateBtn.textContent = 'Gerar';
    }, 16);
  });
});

downloadBtn.addEventListener('click', () => {
  downloadBtn.disabled = true;
  downloadBtn.textContent = 'Gerando alta resolucao...';

  requestAnimationFrame(() => {
    setTimeout(() => {
      downloadFullRes();
      downloadBtn.disabled = false;
      downloadBtn.textContent = 'Baixar PNG';
    }, 16);
  });
});
```

- [ ] **Step 2: Test manually in browser**

Open `http://localhost:8000`. Fill in a name, date, and time. Click "Gerar". Verify:
1. Canvas appears with contour lines on dark background
2. Different inputs produce visibly different outputs
3. Same inputs produce the same output (refresh and re-enter)
4. "Baixar PNG" downloads a file named `contour-<firstname>.png`
5. Button shows "Gerando..." while processing

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: add app module with form handling, generation, and download"
```

---

### Task 6: End-to-End Verification

- [ ] **Step 1: Run all unit tests**

Run: `node --test tests/*.test.js`
Expected: all tests PASS

- [ ] **Step 2: Manual integration test**

Open the app in browser. Test these scenarios:
1. "Alice" / 1990-05-15 / 14:30 — generates a wallpaper
2. "Bob" / 1985-12-01 / 08:00 — generates a visibly different wallpaper
3. Re-enter "Alice" / 1990-05-15 / 14:30 — same wallpaper as #1
4. Download at Full HD — file downloads, opens correctly
5. Download at 4K — file downloads at 3840x2160
6. Mobile resolution — portrait aspect ratio renders correctly
7. Leave a field empty — form validation prevents submit
8. Name with 1 character — form validation prevents submit

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address integration test findings"
```
