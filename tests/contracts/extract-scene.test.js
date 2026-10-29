import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../../app/api/locations/extract-scene/route.js';

describe('POST /api/locations/extract-scene (US-1 Scenario 1.1, F-M3-10, F-M3-11)', () => {
  test('extracts structured editable attributes from free-text scene description', async () => {
    const payload = {
      description: 'A ferry landing at dawn between limestone karsts, 1970s, a waterside village, about 30 extras, night scenes too'
    };

    const req = new Request('http://localhost:3000/api/locations/extract-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const res = await POST(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.ok(data.attributes, 'Should return extracted attributes');
    assert.equal(data.editable, true, 'Attributes payload must be user-editable before search');
    assert.ok(Array.isArray(data.attributes.scene_types));
    assert.ok(data.attributes.scene_types.includes('karst'));
  });

  test('rejects empty or excessively short description under 10 characters', async () => {
    const req = new Request('http://localhost:3000/api/locations/extract-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'short' })
    });

    const res = await POST(req);
    assert.equal(res.status, 400);
  });
});
