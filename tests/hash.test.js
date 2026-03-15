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
