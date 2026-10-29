import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveProvinceInput } from '../../lib/db/search.js';

describe('Pre-2025 Province Name Mapping (BR-006)', () => {
  test('maps old province name "Quảng Nam" to merged provincial unit "Đà Nẵng"', () => {
    const resolved = resolveProvinceInput('Quảng Nam');
    assert.equal(resolved.name, 'Đà Nẵng');
    assert.equal(resolved.isMapped, true);
    assert.ok(resolved.mappingNote.includes('Đà Nẵng'));
  });

  test('maps old province name "Hà Tây" to merged provincial unit "Hà Nội"', () => {
    const resolved = resolveProvinceInput('Hà Tây');
    assert.equal(resolved.name, 'Hà Nội');
    assert.equal(resolved.isMapped, true);
  });

  test('preserves direct modern 34-province name without alteration', () => {
    const resolved = resolveProvinceInput('Ninh Bình');
    assert.equal(resolved.name, 'Ninh Bình');
    assert.equal(resolved.isMapped, false);
  });
});
