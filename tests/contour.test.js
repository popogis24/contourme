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
    const field = new Float64Array([
      0, 0, 0,
      0, 1, 0,
      0, 0, 0,
    ]);
    const segments = extractContours(field, 3, 3, [0.5]);
    assert.ok(Array.isArray(segments));
    assert.ok(segments.length > 0);
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
