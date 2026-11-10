import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// SC-03 and SC-48 view rules (T032; SC-03 #4, #8, #9; SC-48 #2–#10, SR-075; decisions D3, D12).
const view = () => import('../../lib/content-check/view.js');
const TEXT = 'Two soldiers walk to the border post at dawn.';
const F = (n, rule_code, severity, quoted_text) => ({ n, rule_code, severity, quoted_text, span_start: TEXT.indexOf(quoted_text), span_end: TEXT.indexOf(quoted_text) + quoted_text.length });

describe('SC-03 and SC-48 view rules (T032)', () => {
  test('SC-03 #4, #8: the button is enabled only for 20–200 words, with the same count as the API', async () => {
    const { canCheck } = await view();
    const { countWords } = await import('../../lib/content-check/input.js');
    const words = (n) => Array.from({ length: n }, () => 'w').join(' ');
    for (const n of [0, 19, 201]) assert.equal(canCheck(words(n)), false, n);
    for (const n of [20, 200]) assert.equal(canCheck(words(n)), true, n);
    assert.equal(countWords(words(37)), 37);
  });

  test('SR-075: highlights follow the text order, each with a number and a severity label key — never colour alone', async () => {
    const { highlightSegments } = await view();
    const segs = highlightSegments(TEXT, [F(2, 'A9-LONG', 'action', 'border post'), F(1, 'A9-MIL', 'action', 'Two soldiers')]);
    assert.equal(segs.map(s => s.text).join(''), TEXT, 'the text is shown verbatim');
    const marked = segs.filter(s => s.finding);
    assert.deepEqual(marked.map(s => [s.text, s.finding.n, s.finding.labelKey]), [['Two soldiers', 1, 'precheck.severity.action'], ['border post', 2, 'precheck.severity.action']]);
  });

  test('overlapping passages: the later one is not highlighted again but keeps its card', async () => {
    const { highlightSegments } = await view();
    const segs = highlightSegments(TEXT, [F(1, 'A9-MIL', 'action', 'Two soldiers walk'), F(2, 'A9-PERSON', 'notice', 'soldiers')]);
    assert.equal(segs.filter(s => s.finding).length, 1);
    assert.equal(segs.map(s => s.text).join(''), TEXT);
  });

  test('result lines: none → the no-finding text with the version; could_not_check → its text; method line only for keywords', async () => {
    const { resultMessage, methodLineKey } = await view();
    assert.deepEqual(resultMessage({ state: 'none', rule_version: '2026.08' }), { key: 'precheck.result.none', vars: { version: '2026.08' } });
    assert.deepEqual(resultMessage({ state: 'could_not_check' }), { key: 'precheck.result.could_not_check', vars: {} });
    assert.equal(resultMessage({ state: 'findings' }), null);
    assert.equal(methodLineKey({ method: 'keywords' }), 'precheck.method.keywords');
    assert.equal(methodLineKey({ method: 'model' }), null);
  });

  test('D3: a result reopened without the session copy shows no passage and the text-not-kept line', async () => {
    const { resultFromStored } = await view();
    const stored = { brief_id: 'b', rule_version: '2026.08', attention_level: 'medium', findings: [{ n: 1, rule_code: 'A9-MIL', severity: 'action', span_start: 0, span_end: 12 }] };
    const r = resultFromStored(stored, null);
    assert.equal(r.text, null);
    assert.equal(r.textNotKept, true);
    assert.equal(r.findings[0].quoted_text ?? null, null);
    const withCopy = resultFromStored(stored, { brief_id: 'b', text: TEXT, findings: [F(1, 'A9-MIL', 'action', 'Two soldiers')] });
    assert.equal(withCopy.text, TEXT);
    assert.equal(withCopy.textNotKept, false);
    assert.equal(resultFromStored(stored, { brief_id: 'other', text: TEXT }).text, null, 'a copy of another check is not used');
  });

  test('D12: the consent box is shown only when advanced analysis is available; the privacy line is the decided text', async () => {
    const { consentVisible } = await view();
    assert.equal(consentVisible({ advanced_available: true }), true);
    assert.equal(consentVisible({ advanced_available: false }), false);
    assert.equal(vi['precheck.privacy'], 'Văn bản của bạn không được lưu. Khi dùng phân tích nâng cao, văn bản được gửi tạm thời tới nhà cung cấp mô hình AI để xử lý.');
    assert.equal(en['precheck.privacy'], 'Your text is not stored. With advanced analysis, the text is sent temporarily to the AI model provider for processing.');
    assert.equal(typeof vi['precheck.consent'], 'string');
  });

  test('D15: the Sample label key exists in both languages; every severity key exists', () => {
    for (const k of ['precheck.sample', 'precheck.severity.notice', 'precheck.severity.action', 'precheck.disclaimer']) {
      assert.equal(typeof vi[k], 'string', k); assert.equal(typeof en[k], 'string', k);
    }
  });
});
