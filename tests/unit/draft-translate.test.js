import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Translation gate of the bilingual draft (T029 — first part, written 11/11/2026; M5 Clarifications Q3, FR-004, research R5).
// A real script reaches the language model only on the paid Gemini plan AND after the user's tick. The fake client counts
// its calls: without both conditions it must be called 0 times and no Vietnamese text is produced. Scripts are invented.
const translate = () => import('../../lib/drafts/translate.js');
const PARAGRAPHS = [
  { idx: 1, source_text: 'At dawn an old ferryman rows villagers across the river between limestone karsts.' },
  { idx: 2, source_text: 'A young soldier asks him to carry a sealed letter to the other bank before nightfall.' },
  { idx: 3, source_text: 'The ferryman hides the letter under a basket of rice and starts to row.' }
];
const PAID = { LLM_PROVIDER: 'gemini', GEMINI_PAID_TIER: 'true', GEMINI_API_KEY: 'test-key-not-real', GEMINI_MODEL: 'gemini-test', NODE_ENV: 'test' };

function fakeGemini() {
  const calls = [];
  return {
    calls,
    models: {
      async generateContent(request) {
        calls.push(request);
        const asked = PARAGRAPHS.filter(p => JSON.stringify(request).includes(p.source_text));
        return { text: JSON.stringify(asked.map(p => ({ idx: p.idx, target_text: `Bản dịch máy ${p.idx}` }))) };
      }
    }
  };
}

describe('Q3: the script is sent to the model only with the paid plan and the tick (T029)', () => {
  test('GEMINI_PAID_TIER=false, user ticked → the model is called 0 times, method "none", no Vietnamese text', async () => {
    const { translateParagraphs } = await translate();
    const client = fakeGemini();
    const out = await translateParagraphs({ paragraphs: PARAGRAPHS, glossary: [], consent: true }, { env: { ...PAID, GEMINI_PAID_TIER: 'false' }, client });
    assert.equal(client.calls.length, 0, 'no call to the language model');
    assert.equal(out.method, 'none');
    assert.deepEqual(out.translations.map(t => t.target_text), ['', '', '']);
  });

  test('GEMINI_PAID_TIER not set, user ticked → called 0 times', async () => {
    const { translateParagraphs } = await translate();
    const client = fakeGemini();
    const env = { ...PAID }; delete env.GEMINI_PAID_TIER;
    const out = await translateParagraphs({ paragraphs: PARAGRAPHS, glossary: [], consent: true }, { env, client });
    assert.equal(client.calls.length, 0);
    assert.equal(out.method, 'none');
  });

  test('paid plan but the consent box NOT ticked (false or missing) → called 0 times, method "none"', async () => {
    const { translateParagraphs } = await translate();
    for (const consent of [false, undefined, 'true', 1]) {
      const client = fakeGemini();
      const out = await translateParagraphs({ paragraphs: PARAGRAPHS, glossary: [], consent }, { env: PAID, client });
      assert.equal(client.calls.length, 0, `consent ${JSON.stringify(consent)} is not a tick`);
      assert.equal(out.method, 'none');
      assert.ok(out.translations.every(t => t.target_text === ''));
    }
  });

  test('control: paid plan AND ticked → the model is called and its paragraphs come back (the gate is not always closed)', async () => {
    const { translateParagraphs } = await translate();
    const client = fakeGemini();
    const out = await translateParagraphs({ paragraphs: PARAGRAPHS, glossary: [], consent: true }, { env: PAID, client });
    assert.ok(client.calls.length >= 1);
    assert.equal(out.method, 'gemini');
    assert.deepEqual(out.translations.map(t => t.target_text), ['Bản dịch máy 1', 'Bản dịch máy 2', 'Bản dịch máy 3']);
    assert.deepEqual(out.failed, []);
  });
});

// ---- T029, rest (written 11/11/2026): mock mode, U1, batching and failures, glossary in the prompt, secrets ----------
describe('Translation: mock mode, batches, failures, glossary, secrets (T029)', () => {
  test('mock: deterministic "[VI] " + source with the glossary applied; only when LLM_PROVIDER=mock and not in production', async () => {
    const { translateParagraphs } = await translate();
    const env = { LLM_PROVIDER: 'mock', NODE_ENV: 'test' };
    const a = await translateParagraphs({ paragraphs: PARAGRAPHS, glossary: [{ term_en: 'ferryman', term_vi: 'người lái đò' }], consent: false }, { env });
    const b = await translateParagraphs({ paragraphs: PARAGRAPHS, glossary: [{ term_en: 'ferryman', term_vi: 'người lái đò' }], consent: false }, { env });
    assert.equal(a.method, 'mock');
    assert.deepEqual(a, b, 'deterministic');
    assert.match(a.translations[0].target_text, /^\[VI\] /);
    assert.match(a.translations[0].target_text, /người lái đò/);
  });

  test('U1: NODE_ENV=production with LLM_PROVIDER unset or mock → nothing is translated (method "none")', async () => {
    const { translateParagraphs } = await translate();
    for (const env of [{ NODE_ENV: 'production' }, { NODE_ENV: 'production', LLM_PROVIDER: 'mock' }]) {
      const out = await translateParagraphs({ paragraphs: PARAGRAPHS, glossary: [], consent: true }, { env });
      assert.equal(out.method, 'none', JSON.stringify(env));
      assert.ok(out.translations.every(t => t.target_text === ''));
    }
  });

  test('batches of at most 5; a failed batch or a missing paragraph leaves only those idx failed; a retry sends one paragraph', async () => {
    const { translateParagraphs } = await translate();
    const many = Array.from({ length: 12 }, (_, i) => ({ idx: i + 1, source_text: `Line ${i + 1} of an invented script about a ferry.` }));
    const calls = [];
    const client = { models: { async generateContent(req) {
      const asked = many.filter(p => JSON.stringify(req).includes(p.source_text));
      calls.push(asked.map(p => p.idx));
      if (asked.some(p => p.idx === 6)) throw new Error('model down');
      return { text: JSON.stringify(asked.filter(p => p.idx !== 12).map(p => ({ idx: p.idx, target_text: `VI ${p.idx}` }))) };
    } } };
    const out = await translateParagraphs({ paragraphs: many, glossary: [], consent: true }, { env: PAID, client });
    assert.ok(calls.every(c => c.length <= 5));
    assert.deepEqual(out.failed.sort((a, b) => a - b), [6, 7, 8, 9, 10, 12]);
    assert.equal(out.translations.find(t => t.idx === 1).target_text, 'VI 1');
    assert.equal(out.translations.find(t => t.idx === 6).target_text, '');
    calls.length = 0;
    const retry = await translateParagraphs({ paragraphs: many.filter(p => p.idx === 12), glossary: [], consent: true }, { env: PAID, client: { models: { async generateContent(req) { calls.push(req); return { text: JSON.stringify([{ idx: 12, target_text: 'VI 12' }]) }; } } } });
    assert.equal(calls.length, 1);
    assert.deepEqual(retry.translations, [{ idx: 12, target_text: 'VI 12' }]);
  });

  test('BR-006: the prompt carries every glossary pair as fixed translations', async () => {
    const { translateParagraphs } = await translate();
    const client = fakeGemini();
    await translateParagraphs({ paragraphs: PARAGRAPHS, glossary: [{ term_en: 'ferry', term_vi: 'đò' }, { term_en: 'karst', term_vi: 'núi đá vôi' }], consent: true }, { env: PAID, client });
    const req = JSON.stringify(client.calls[0]);
    assert.match(req, /ferry/); assert.match(req, /đò/); assert.match(req, /núi đá vôi/);
  });

  test('secrets: neither the key nor the script appears in any console output, even when the model fails', async () => {
    const { translateParagraphs } = await translate();
    const lines = [];
    const saved = { log: console.log, warn: console.warn, error: console.error, info: console.info };
    console.log = console.warn = console.error = console.info = (...a) => lines.push(a.map(String).join(' '));
    try {
      await translateParagraphs({ paragraphs: PARAGRAPHS, glossary: [], consent: true }, { env: PAID, client: { models: { async generateContent() { throw new Error('boom'); } } } });
      await translateParagraphs({ paragraphs: PARAGRAPHS, glossary: [], consent: true }, { env: PAID, client: fakeGemini() });
    } finally { Object.assign(console, saved); }
    const all = lines.join('\n');
    assert.doesNotMatch(all, /test-key-not-real/);
    for (const p of PARAGRAPHS) assert.ok(!all.includes(p.source_text));
  });
});
