import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../../app/api/locations/extract-scene/route.js';

function post(description) {
  return POST(new Request('http://localhost:3000/api/locations/extract-scene', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description })
  }));
}

describe('POST /api/locations/extract-scene provider metadata (F-M3-11, SC-15)', () => {
  test('F-M3-11: with LLM_PROVIDER unset the route uses the rule-based extractor and says so', async () => {
    const saved = process.env.LLM_PROVIDER;
    delete process.env.LLM_PROVIDER;
    try {
      const res = await post('cảnh chợ nổi lúc bình minh, 20 người, tháng 3');
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.provider, 'mock');
      assert.equal(data.fallback, false);
      assert.ok(Array.isArray(data.rejected), 'Dropped values are always reported');
    } finally {
      if (saved !== undefined) process.env.LLM_PROVIDER = saved;
    }
  });

  test('SC-15: LLM_PROVIDER=gemini without a key still answers, in fallback mode, without the key', async () => {
    const saved = { ...process.env };
    process.env.LLM_PROVIDER = 'gemini';
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    try {
      const res = await post('cảnh chợ nổi lúc bình minh, 20 người, tháng 3');
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.fallback, true);
      assert.equal(data.fallback_reason, 'not_configured');
      assert.ok(data.attributes.scene_types.includes('market'));
    } finally {
      process.env = saved;
    }
  });
});
