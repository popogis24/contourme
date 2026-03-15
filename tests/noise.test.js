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
