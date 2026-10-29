import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getDb } from '../../lib/db/client.js';
import { removeDiacritics } from '../../lib/db/search.js';

// Imported inside each test so every scenario reports its own failure until lib/extraction exists.
const loadExtraction = () => import('../../lib/extraction/index.js');

const FLOATING_MARKET = 'cảnh chợ nổi lúc bình minh, 20 người, tháng 3';
const SECRET = 'test-secret-key-do-not-leak';
const GEMINI_ENV = { LLM_PROVIDER: 'gemini', GEMINI_API_KEY: SECRET, GEMINI_MODEL: 'fake-flash' };

// Stand-in for @google/genai: records each request, never touches the network.
function fakeGemini(respond) {
  const calls = [];
  return {
    calls,
    client: {
      models: {
        generateContent: async (params) => {
          calls.push(params);
          return respond(params);
        }
      }
    }
  };
}

const jsonReply = (obj) => () => ({ text: JSON.stringify(obj) });

function rateLimitError() {
  const err = new Error('got status: 429 Too Many Requests. Resource has been exhausted');
  err.status = 429;
  return err;
}

// Every location name in the seed, published or not, without diacritics
function seedLocationNames() {
  return getDb()
    .prepare('SELECT name_vi, name_en FROM location')
    .all()
    .flatMap(r => [r.name_vi, r.name_en])
    .map(n => removeDiacritics(n).toLowerCase());
}

describe('Gemini scene extractor behind the common extractor interface (F-M3-10, F-M3-11, F-M3-12, BR-001)', () => {
  test('F-M3-11: valid Gemini JSON becomes catalogue attributes (floating market, dawn, 20 people, March)', async () => {
    const { extractScene } = await loadExtraction();
    const { client, calls } = fakeGemini(jsonReply({
      scene_types: ['floating_village', 'market', 'river'],
      crew_size: '15_50',
      shoot_month: 3,
      era: 'contemporary',
      notes: 'Dawn light on the water.'
    }));

    const result = await extractScene(FLOATING_MARKET, { env: GEMINI_ENV, geminiClient: client });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].model, 'fake-flash', 'Model comes from GEMINI_MODEL');
    assert.equal(calls[0].config.responseMimeType, 'application/json', 'Gemini is asked for JSON');
    assert.ok(calls[0].config.responseSchema, 'Gemini is given the response schema');

    assert.equal(result.provider, 'gemini');
    assert.equal(result.fallback, false);
    assert.deepEqual([...result.attributes.scene_types].sort(), ['floating_village', 'market', 'river']);
    assert.equal(result.attributes.crowd_scale, '15_50');
    assert.equal(result.attributes.shoot_month, 3);
    assert.equal(result.attributes.era, 'contemporary');
    assert.equal(result.editable, true);
  });

  test('F-M3-12: values outside the catalogue are dropped and reported to the user', async () => {
    const { extractScene } = await loadExtraction();
    const { client } = fakeGemini(jsonReply({
      scene_types: ['spaceship', 'market', 'chợ'],
      crew_size: '200_people',
      shoot_month: 14,
      era: 'year_3000',
      notes: null
    }));

    const result = await extractScene(FLOATING_MARKET, { env: GEMINI_ENV, geminiClient: client });

    assert.deepEqual(result.attributes.scene_types, ['market'], 'Only catalogue values survive (chợ maps to market)');
    assert.equal(result.attributes.crowd_scale, null);
    assert.equal(result.attributes.shoot_month, null);
    assert.equal(result.attributes.era, null);
    for (const dropped of ['spaceship', '200_people', '14', 'year_3000']) {
      assert.ok(result.rejected.map(String).includes(dropped), `"${dropped}" is reported in rejected`);
    }
    assert.ok(result.mapped_synonyms.some(m => m.original === 'chợ' && m.mapped === 'market'), 'Synonym mapping is shown');
  });

  test('Timeout: no answer within the time limit falls back to the rule-based extractor', async () => {
    const { extractScene, GEMINI_TIMEOUT_MS } = await loadExtraction();
    assert.equal(GEMINI_TIMEOUT_MS, 8000, 'Production limit is 8 seconds');

    const { client } = fakeGemini(() => new Promise(() => {}));
    const started = Date.now();
    const result = await extractScene(FLOATING_MARKET, { env: GEMINI_ENV, geminiClient: client, timeoutMs: 50 });

    assert.ok(Date.now() - started < 2000, 'The request does not hang');
    assert.equal(result.provider, 'mock');
    assert.equal(result.fallback, true);
    assert.equal(result.fallback_reason, 'timeout');
    assert.ok(result.attributes.scene_types.includes('market'), 'Rule-based extractor still finds "chợ"');
  });

  test('429: a rate-limited Gemini call falls back to the rule-based extractor', async () => {
    const { extractScene } = await loadExtraction();
    const { client } = fakeGemini(() => { throw rateLimitError(); });

    const result = await extractScene(FLOATING_MARKET, { env: GEMINI_ENV, geminiClient: client });

    assert.equal(result.provider, 'mock');
    assert.equal(result.fallback, true);
    assert.equal(result.fallback_reason, 'rate_limited');
  });

  test('Network error: a failed fetch falls back to the rule-based extractor', async () => {
    const { extractScene } = await loadExtraction();
    const { client } = fakeGemini(() => { throw new TypeError('fetch failed'); });

    const result = await extractScene(FLOATING_MARKET, { env: GEMINI_ENV, geminiClient: client });

    assert.equal(result.fallback, true);
    assert.equal(result.fallback_reason, 'network');
  });

  test('Invalid JSON from Gemini falls back instead of failing the request', async () => {
    const { extractScene } = await loadExtraction();
    const { client } = fakeGemini(() => ({ text: 'Sure! Here are some ideas: floating market' }));

    const result = await extractScene(FLOATING_MARKET, { env: GEMINI_ENV, geminiClient: client });

    assert.equal(result.fallback, true);
    assert.equal(result.fallback_reason, 'invalid_response');
  });

  test('BR-001: never returns a location name or a score, even when the model offers them', async () => {
    const { extractScene } = await loadExtraction();
    const { client } = fakeGemini(jsonReply({
      scene_types: ['floating_village', 'market', 'Cái Răng Floating Market'],
      crew_size: '15_50',
      shoot_month: 3,
      era: 'contemporary',
      notes: 'Best match: Chợ nổi Cái Răng (Cái Răng Floating Market), score 92/100.',
      locations: ['Cái Răng Floating Market'],
      score: 92,
      ranking: [{ name: 'Hội An Ancient Town', score: 81 }]
    }));

    const result = await extractScene(FLOATING_MARKET, { env: GEMINI_ENV, geminiClient: client });
    const text = removeDiacritics(JSON.stringify(result)).toLowerCase();

    for (const name of seedLocationNames()) {
      assert.ok(!text.includes(name), `Response must not name "${name}"`);
    }
    for (const key of ['"locations"', '"score"', '"ranking"', '92', '81']) {
      assert.ok(!text.includes(key), `Response must not contain ${key}`);
    }
    assert.equal(result.attributes.notes, null, 'Notes naming a place or a score are dropped');
    assert.deepEqual([...result.attributes.scene_types].sort(), ['floating_village', 'market'], 'Catalogue values are kept');
  });

  test('BR-001: the prompt sent to Gemini contains no location from the database', async () => {
    const { extractScene } = await loadExtraction();
    const { client, calls } = fakeGemini(jsonReply({ scene_types: ['market'], crew_size: null, shoot_month: null, era: null, notes: null }));

    await extractScene(FLOATING_MARKET, { env: GEMINI_ENV, geminiClient: client });
    const sent = removeDiacritics(JSON.stringify(calls[0])).toLowerCase();

    for (const name of seedLocationNames()) {
      assert.ok(!sent.includes(name), `Prompt must not include "${name}"`);
    }
  });

  test('The API key never appears in the result, on success or on fallback', async () => {
    const { extractScene } = await loadExtraction();
    const ok = fakeGemini(jsonReply({ scene_types: ['market'], crew_size: null, shoot_month: null, era: null, notes: null }));
    const failing = fakeGemini(() => { throw new Error(`request failed for key=${SECRET}`); });

    for (const client of [ok.client, failing.client]) {
      const result = await extractScene(FLOATING_MARKET, { env: GEMINI_ENV, geminiClient: client });
      assert.ok(!JSON.stringify(result).includes(SECRET));
    }
  });

  test('LLM_PROVIDER=mock (or unset) uses the rule-based extractor and never calls Gemini', async () => {
    const { extractScene } = await loadExtraction();
    for (const env of [{}, { LLM_PROVIDER: 'mock', GEMINI_API_KEY: SECRET, GEMINI_MODEL: 'fake-flash' }]) {
      const { client, calls } = fakeGemini(jsonReply({ scene_types: ['cave'] }));
      const result = await extractScene(FLOATING_MARKET, { env, geminiClient: client });

      assert.equal(calls.length, 0);
      assert.equal(result.provider, 'mock');
      assert.equal(result.fallback, false);
    }
  });

  test('LLM_PROVIDER=gemini without a key or model falls back without calling Gemini', async () => {
    const { extractScene } = await loadExtraction();
    const { client, calls } = fakeGemini(jsonReply({ scene_types: ['cave'] }));

    const result = await extractScene(FLOATING_MARKET, { env: { LLM_PROVIDER: 'gemini' }, geminiClient: client });

    assert.equal(calls.length, 0);
    assert.equal(result.fallback, true);
    assert.equal(result.fallback_reason, 'not_configured');
  });
});
