import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// The passage matcher (T026, FR-011, research R3, decisions D4, D12): the model only locates passages for the active
// rules; any failure, no paid plan or no consent → the deterministic keyword match. A fake Gemini client — no network.
const matcher = () => import('../../lib/content-check/matcher.js');
const keywords = () => import('../../lib/content-check/keyword-matcher.js');
const KEY = 'gm_test_DO_NOT_LEAK_789';
const RULES = [
  { rule_code: 'A9-MIL', title_en: 'Military uniforms', description_en: 'Military content', keywords_vi: ['bộ đội', 'quân phục'], keywords_en: ['soldiers', 'military uniform'] },
  { rule_code: 'A9-LONG', title_en: 'Border areas', description_en: 'Border scenes', keywords_vi: ['biên giới', 'đồn biên phòng'], keywords_en: ['border', 'border post'] },
  { rule_code: 'A13-DOSSIER', title_en: 'Dossier', description_en: 'Dossier', keywords_vi: [], keywords_en: [] }
];
const TEXT = 'Two Soldiers walk to the border post. Nobody saw the soldiers again.';
const PAID = { LLM_PROVIDER: 'gemini', GEMINI_API_KEY: KEY, GEMINI_MODEL: 'gemini-test', GEMINI_PAID_TIER: 'true' };
function fakeClient(reply) {
  const calls = [];
  return { calls, models: { generateContent: async (req) => { calls.push(req); return typeof reply === 'function' ? reply(req) : reply; } } };
}

describe('Passage matcher (T026)', () => {
  test('keyword match: case-insensitive, whole word, language-specific; the longest keyword wins at one place', async () => {
    const { matchKeywords } = await keywords();
    const pairs = matchKeywords({ text: TEXT, lang: 'en', rules: RULES });
    assert.deepEqual(pairs.filter(p => p.rule_code === 'A9-MIL').map(p => p.quoted_text), ['Soldiers', 'soldiers'], 'text as written');
    assert.deepEqual(pairs.filter(p => p.rule_code === 'A9-LONG').map(p => p.quoted_text), ['border post'], 'not also "border" inside it');
    assert.deepEqual(matchKeywords({ text: 'Borderline cases', lang: 'en', rules: RULES }), [], 'whole words only');
    assert.deepEqual(matchKeywords({ text: TEXT, lang: 'vi', rules: RULES }), [], 'Vietnamese keywords for a vi summary');
    assert.deepEqual(matchKeywords({ text: 'Anh bộ đội đứng ở đồn biên phòng', lang: 'vi', rules: RULES }).map(p => p.rule_code).sort(), ['A9-LONG', 'A9-MIL']);
  });

  test('D12: mock provider, missing key, no paid plan or no consent → keyword match without calling the model', async () => {
    const { findPassages } = await matcher();
    for (const [env, consent] of [[{ LLM_PROVIDER: 'mock' }, true], [{ ...PAID, GEMINI_API_KEY: '' }, true], [{ ...PAID, GEMINI_PAID_TIER: 'false' }, true], [PAID, false]]) {
      const client = fakeClient({ text: '{"findings":[]}' });
      const out = await findPassages({ text: TEXT, lang: 'en', rules: RULES, consent }, { env, client });
      assert.equal(out.method, 'keywords');
      assert.equal(client.calls.length, 0);
      assert.ok(out.pairs.length >= 3);
    }
  });

  test('FR-011: with a paid plan and consent the model is asked about the active codes only, with verbatim quotes', async () => {
    const { findPassages } = await matcher();
    const client = fakeClient({ text: JSON.stringify({ findings: [{ rule_code: 'A9-MIL', quoted_text: 'Two Soldiers walk' }] }) });
    const out = await findPassages({ text: TEXT, lang: 'en', rules: RULES, consent: true }, { env: PAID, client });
    assert.equal(out.method, 'model');
    assert.deepEqual(out.pairs, [{ rule_code: 'A9-MIL', quoted_text: 'Two Soldiers walk' }]);
    const req = client.calls[0];
    assert.equal(req.model, 'gemini-test');
    assert.equal(req.contents, TEXT);
    const schema = JSON.stringify(req.config.responseSchema);
    assert.match(schema, /"enum":\["A9-MIL","A9-LONG","A13-DOSSIER"\]/);
    assert.match(req.config.systemInstruction, /exactly|verbatim/i);
    assert.match(req.config.systemInstruction, /never .*(judge|conclude|approve)/i);
  });

  test('timeout, 429, network error or invalid JSON → keyword match; the model text and extra fields never pass through', async () => {
    const { findPassages } = await matcher();
    const replies = [
      () => new Promise(() => {}),
      () => { throw Object.assign(new Error('quota'), { status: 429 }); },
      () => { throw new TypeError('fetch failed'); },
      { text: 'not json' }
    ];
    for (const reply of replies) {
      const out = await findPassages({ text: TEXT, lang: 'en', rules: RULES, consent: true }, { env: PAID, client: fakeClient(reply), timeoutMs: 20 });
      assert.equal(out.method, 'keywords');
    }
    const extra = await findPassages({ text: TEXT, lang: 'en', rules: RULES, consent: true },
      { env: PAID, client: fakeClient({ text: JSON.stringify({ findings: [{ rule_code: 'A9-MIL', quoted_text: 'Soldiers', explanation: 'This is illegal', level: 'high' }] }) }) });
    assert.deepEqual(extra.pairs, [{ rule_code: 'A9-MIL', quoted_text: 'Soldiers' }]);
  });

  test('the key and the summary never reach a log line or the result', async () => {
    const { findPassages } = await matcher();
    const lines = [];
    const saved = { log: console.log, warn: console.warn, error: console.error };
    console.log = console.warn = console.error = (...a) => lines.push(a.join(' '));
    try {
      const out = await findPassages({ text: TEXT, lang: 'en', rules: RULES, consent: true },
        { env: PAID, client: fakeClient(() => { throw new Error(`bad key ${KEY} for ${TEXT}`); }) });
      assert.equal(JSON.stringify(out).includes(KEY), false);
    } finally { Object.assign(console, saved); }
    assert.ok(!lines.some(l => l.includes(KEY) || l.includes('Two Soldiers')), lines.join('\n'));
  });
});
