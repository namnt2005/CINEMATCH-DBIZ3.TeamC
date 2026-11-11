import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Paragraphs of the English source (T028; M5 FR-004, US-2 Sc1; research R4). Scripts are invented.
const p = () => import('../../lib/drafts/paragraphs.js');

describe('splitParagraphs() and the limits (T028)', () => {
  test('blank lines split; CRLF, spaces and empty paragraphs are cleaned; order kept', async () => {
    const { splitParagraphs } = await p();
    assert.deepEqual(splitParagraphs('  First   line\r\nstill first.\r\n\r\n\r\nSecond.\n\n   \n\nThird.  '), ['First line still first.', 'Second.', 'Third.']);
    assert.deepEqual(splitParagraphs(''), []);
  });

  test('US-2 Sc1: a 14-paragraph text gives 14 paragraphs', async () => {
    const { splitParagraphs } = await p();
    const text = Array.from({ length: 14 }, (_, i) => `Paragraph ${i + 1}: the ferryman rows across the river at dawn.`).join('\n\n');
    const out = splitParagraphs(text);
    assert.equal(out.length, 14);
    assert.match(out[13], /^Paragraph 14:/);
  });

  test('limits: 1–100 paragraphs, 4,000 characters each, 60,000 in all → drafts.error.text', async () => {
    const { checkParagraphs, LIMITS } = await p();
    assert.deepEqual(LIMITS, { paragraphs: 100, chars: 4000, total: 60000 });
    assert.equal(checkParagraphs(['ok']), null);
    assert.equal(checkParagraphs([]), 'drafts.error.text');
    assert.equal(checkParagraphs(Array(101).fill('x')), 'drafts.error.text');
    assert.equal(checkParagraphs(['x'.repeat(4001)]), 'drafts.error.text');
    assert.equal(checkParagraphs(Array(16).fill('x'.repeat(3800))), 'drafts.error.text', '60,800 characters in all');
    assert.equal(checkParagraphs(Array(15).fill('x'.repeat(4000))), null, 'exactly 60,000');
  });
});
