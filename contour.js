import { createNoise2D } from './noise.js';

/**
 * Generate a 2D scalar field using layered simplex noise.
 */
export function generateField(width, height, params, seed) {
  const noise = createNoise2D(seed);
  const field = new Float64Array(width * height);

  const octaves = Math.floor(params.complexity * 5) + 1;  // 1-6
  const baseScale = 0.002 + params.scale * 0.008;         // 0.002-0.01
  const fxPx = params.focusX * width;
  const fyPx = params.focusY * height;
  const fStr = params.focusStrength * 0.5;                 // 0-0.5
  const cosA = Math.cos(params.angle * Math.PI * 2);
  const sinA = Math.sin(params.angle * Math.PI * 2);
  const maxDist = Math.sqrt(width * width + height * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Apply rotation
      const rx = (x - width / 2) * cosA - (y - height / 2) * sinA + width / 2;
      const ry = (x - width / 2) * sinA + (y - height / 2) * cosA + height / 2;

      // Apply focus distortion
      const dx = rx - fxPx;
      const dy = ry - fyPx;
      const dist = Math.sqrt(dx * dx + dy * dy);
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
      field[y * width + x] = value / maxAmp;
    }
  }
  return field;
}

/**
 * Extract contour line segments using marching squares.
 */
export function extractContours(field, width, height, thresholds) {
  const segments = [];

  for (const threshold of thresholds) {
    const lerp = (a, b, va, vb) => {
      const t = (threshold - va) / (vb - va);
      return a + t * (b - a);
    };

    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const tl = field[y * width + x];
        const tr = field[y * width + x + 1];
        const br = field[(y + 1) * width + x + 1];
        const bl = field[(y + 1) * width + x];

        const caseIndex =
          (tl >= threshold ? 8 : 0) |
          (tr >= threshold ? 4 : 0) |
          (br >= threshold ? 2 : 0) |
          (bl >= threshold ? 1 : 0);

        if (caseIndex === 0 || caseIndex === 15) continue;

        const top    = { x: lerp(x, x + 1, tl, tr), y };
        const right  = { x: x + 1, y: lerp(y, y + 1, tr, br) };
        const bottom = { x: lerp(x, x + 1, bl, br), y: y + 1 };
        const left   = { x, y: lerp(y, y + 1, tl, bl) };

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
 */
export function renderContours(ctx, segments, fieldWidth, fieldHeight, canvasWidth, canvasHeight, lineWeight) {
  const scaleX = canvasWidth / fieldWidth;
  const scaleY = canvasHeight / fieldHeight;
  const lw = 0.5 + lineWeight * 2;

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
