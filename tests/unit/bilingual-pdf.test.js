import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Two-column draft PDF (T032; M5 FR-005, BR-001, decision D2, research R9). Every page carries
// "DRAFT — REQUIRES PROOFREADING · BẢN NHÁP — CẦN HIỆU ĐÍNH". Checked twice: in the element tree (a `fixed` node inside
// the only wrapping page) and by the renderer itself — the watermark's render callback reports each page it is drawn
// on, and that set must be every page of the rendered file. Paragraphs are invented.
const pdf = () => import('../../lib/pdf/bilingual-pdf.js');
const WATERMARK_EN = 'DRAFT — REQUIRES PROOFREADING';
const WATERMARK_VI = 'BẢN NHÁP — CẦN HIỆU ĐÍNH';
const LONG = 'The ferryman rows slowly while the soldiers watch the far bank and the mist lifts over the karst towers. '.repeat(6);
const paragraphs = (status) => Array.from({ length: 14 }, (_, i) => ({ idx: i + 1, source_text: `${i + 1}. ${LONG}`,
  target_text: `${i + 1}. Người lái đò chèo chậm trong khi những người lính nhìn sang bờ bên kia. `.repeat(6), status: status(i) }));
const input = (status = (i) => (i % 2 ? 'reviewed' : 'machine')) => ({ title: 'The Last Ferry', meta: { segment: 'A' }, paragraphs: paragraphs(status) });

function walk(el, out = []) {
  if (!el || typeof el !== 'object') return out;
  if (Array.isArray(el)) { el.forEach(c => walk(c, out)); return out; }
  out.push(el);
  walk(el.props?.children, out);
  return out;
}
function textOf(el) {
  if (el == null || typeof el === 'boolean') return '';
  if (typeof el === 'string' || typeof el === 'number') return String(el);
  if (Array.isArray(el)) return el.map(textOf).join('');
  const own = typeof el.props?.render === 'function' ? String(el.props.render({ pageNumber: 1, totalPages: 1 }) ?? '') : '';
  return own + textOf(el.props?.children);
}

describe('BR-001: the draft watermark is on every page (T032)', () => {
  test('element tree: one wrapping Page; a fixed node with both watermark texts; even at 100 % proofread', async () => {
    const { Page } = await import('@react-pdf/renderer');
    const { buildBilingualDocument } = await pdf();
    for (const status of [(i) => (i % 2 ? 'reviewed' : 'machine'), () => 'reviewed']) {
      const nodes = walk(buildBilingualDocument(input(status)));
      const pages = nodes.filter(n => n.type === Page);
      assert.equal(pages.length, 1, 'one Page that wraps onto as many pages as needed');
      assert.notEqual(pages[0].props.wrap, false);
      const fixed = walk(pages[0].props.children).filter(n => n.props?.fixed);
      assert.ok(fixed.some(n => textOf(n).includes(WATERMARK_EN) && textOf(n).includes(WATERMARK_VI)), 'fixed bilingual watermark');
    }
  });

  test('rendered file: more than one page, and the watermark is drawn on every one of them', async () => {
    const { renderBilingualPdf } = await pdf();
    const seen = new Set();
    let total = 0;
    const buffer = await renderBilingualPdf(input(), { onWatermarkPage: ({ pageNumber, totalPages }) => { seen.add(pageNumber); total = Math.max(total, totalPages); } });
    assert.ok(Buffer.isBuffer(buffer));
    assert.equal(buffer.subarray(0, 5).toString('latin1'), '%PDF-');
    const pageObjects = (buffer.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
    assert.ok(pageObjects > 1, `a 14-paragraph draft spans several pages (${pageObjects})`);
    assert.equal(total, pageObjects, 'the renderer and the file agree on the page count');
    assert.deepEqual([...seen].sort((a, b) => a - b), Array.from({ length: pageObjects }, (_, i) => i + 1), 'watermark on every page');
  });
});

// ---- T032, rest (written 11/11/2026): the Not proofread flag, the font, loading without JSX -------------------------
describe('PDF rows, font and module (T032)', () => {
  test('every machine paragraph row carries "Not proofread"; no reviewed row does', async () => {
    const { buildBilingualDocument } = await pdf();
    const doc = buildBilingualDocument(input());
    const rows = walk(doc).filter(n => n.props?.['data-paragraph']);
    assert.equal(rows.length, 14);
    for (const r of rows) {
      const flagged = textOf(r).includes('Not proofread') && textOf(r).includes('Chưa hiệu đính');
      assert.equal(flagged, r.props['data-status'] === 'machine', `paragraph ${r.props['data-paragraph']}`);
    }
  });

  test('Noto Sans is registered from lib/pdf/fonts (Vietnamese diacritics); the module has no JSX', async () => {
    const { FONT_FILES } = await pdf();
    const fs = await import('node:fs');
    assert.ok(FONT_FILES.length >= 2);
    for (const f of FONT_FILES) { assert.match(f, /lib\/pdf\/fonts\/NotoSans-(Regular|Bold)\.ttf$/); assert.ok(fs.existsSync(f), f); }
    assert.doesNotMatch(fs.readFileSync('lib/pdf/bilingual-pdf.js', 'utf8'), /<[A-Z][A-Za-z]*[\s/>]/, 'React.createElement, no JSX');
  });
});
