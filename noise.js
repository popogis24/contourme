// 2D Simplex Noise — seeded, deterministic
// Based on Stefan Gustavson's simplex noise algorithm.

const GRAD2 = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

// Skewing factors for 2D simplex grid
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

/**
 * xorshift32 PRNG — returns next state and a float in [0, 1).
 * Operates on 32-bit unsigned integers.
 */
function xorshift32(state) {
  // state must be non-zero
  let x = state >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0;
}

/**
 * Build a doubled permutation table [0..511] from a seed.
 */
function buildPermTable(seed) {
  // Ensure non-zero seed for xorshift32
  let state = (seed >>> 0) || 1;

  // Initialize p[0..255]
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;

  // Fisher-Yates shuffle using xorshift32
  for (let i = 255; i > 0; i--) {
    state = xorshift32(state);
    const j = state % (i + 1);
    // swap
    const tmp = p[i];
    p[i] = p[j];
    p[j] = tmp;
  }

  // Double the table to avoid modulo in hot path
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
  }
  return perm;
}

/**
 * createNoise2D(seed) — returns a noise2D(x, y) function.
 * Outputs are in approximately [-1, 1].
 */
export function createNoise2D(seed) {
  const perm = buildPermTable(seed);

  return function noise2D(x, y) {
    // Step 1: Skew input space to determine which simplex cell we are in
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * G2;
    // Unskew the cell origin back to (x, y) space
    const X0 = i - t;
    const Y0 = j - t;
    // Distance from cell origin
    const x0 = x - X0;
    const y0 = y - Y0;

    // Step 2: Determine which simplex triangle we are in
    // For 2D, there are only two simplex shapes: lower-left or upper-right triangle
    let i1, j1; // Offsets for second corner of simplex
    if (x0 > y0) {
      // Lower triangle, XY order: (0,0) -> (1,0) -> (1,1)
      i1 = 1; j1 = 0;
    } else {
      // Upper triangle, YX order: (0,0) -> (0,1) -> (1,1)
      i1 = 0; j1 = 1;
    }

    // Offsets for second and third corners in (x, y) unskewed coords
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    // Step 3: Work out hashed gradient indices for three corners
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = perm[ii + perm[jj]] % 8;
    const gi1 = perm[ii + i1 + perm[jj + j1]] % 8;
    const gi2 = perm[ii + 1 + perm[jj + 1]] % 8;

    // Step 4: Calculate gradient contributions from each corner
    let n0, n1, n2;

    // Corner 0
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0;
    } else {
      t0 *= t0;
      const [gx0, gy0] = GRAD2[gi0];
      n0 = t0 * t0 * (gx0 * x0 + gy0 * y0);
    }

    // Corner 1
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0;
    } else {
      t1 *= t1;
      const [gx1, gy1] = GRAD2[gi1];
      n1 = t1 * t1 * (gx1 * x1 + gy1 * y1);
    }

    // Corner 2
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0;
    } else {
      t2 *= t2;
      const [gx2, gy2] = GRAD2[gi2];
      n2 = t2 * t2 * (gx2 * x2 + gy2 * y2);
    }

    // Step 5: Sum contributions, scale to [-1, 1]
    // The scaling factor 70.0 is from Gustavson's reference implementation
    return 70.0 * (n0 + n1 + n2);
  };
}
