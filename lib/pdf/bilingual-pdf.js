// Two-column English–Vietnamese draft PDF (M5 FR-005, BR-001; specs/009-m5-dossier D2, research R9). One wrapping page:
// its `fixed` header and diagonal mark are drawn by react-pdf on every page, so every page says
// "DRAFT — REQUIRES PROOFREADING · BẢN NHÁP — CẦN HIỆU ĐÍNH"; paragraphs not yet proofread carry their own flag.
// Built with React.createElement (no JSX) so node --test loads it; Noto Sans carries the Vietnamese diacritics.
import path from 'node:path';
import React from 'react';
import { Document, Page, View, Text, Font, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const h = React.createElement;
export const FONT_FILES = ['NotoSans-Regular.ttf', 'NotoSans-Bold.ttf'].map(f => path.join(process.cwd(), 'lib', 'pdf', 'fonts', f));
export const LABELS = Object.freeze({
  watermark: 'DRAFT — REQUIRES PROOFREADING · BẢN NHÁP — CẦN HIỆU ĐÍNH',
  notProofread: 'Not proofread · Chưa hiệu đính',
  english: 'English', vietnamese: 'Tiếng Việt',
  page: (n, total) => `${n} / ${total}`
});

let registered = false;
function registerFonts() {
  if (registered) return;
  Font.register({ family: 'NotoSans', fonts: [{ src: FONT_FILES[0], fontWeight: 400 }, { src: FONT_FILES[1], fontWeight: 700 }] });
  Font.registerHyphenationCallback(word => [word]);              // never split a Vietnamese syllable
  registered = true;
}

const s = StyleSheet.create({
  page: { fontFamily: 'NotoSans', fontSize: 9.5, paddingTop: 54, paddingBottom: 42, paddingHorizontal: 36, color: '#111827' },
  header: { position: 'absolute', top: 18, left: 36, right: 36, borderBottomWidth: 1, borderBottomColor: '#b91c1c', paddingBottom: 4 },
  headerText: { color: '#b91c1c', fontWeight: 700, fontSize: 10, textAlign: 'center' },
  diagonal: { position: 'absolute', top: 360, left: 40, right: 40, transform: 'rotate(-30deg)', opacity: 0.12 },
  diagonalText: { color: '#b91c1c', fontWeight: 700, fontSize: 26, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 18, left: 36, right: 36, fontSize: 8, color: '#6b7280', textAlign: 'right' },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  meta: { fontSize: 8.5, color: '#6b7280', marginBottom: 10 },
  colHeads: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#9ca3af', paddingBottom: 3, marginBottom: 4, fontWeight: 700 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', paddingVertical: 5 },
  idx: { width: 22, color: '#6b7280' },
  col: { flex: 1, paddingRight: 8 },
  flag: { color: '#b91c1c', fontWeight: 700, fontSize: 8, marginTop: 2 }
});

/** The element tree: { title, meta, paragraphs: [{ idx, source_text, target_text, status }] }. */
export function buildBilingualDocument({ title, meta = {}, paragraphs = [] }, { labels = LABELS, onWatermarkPage } = {}) {
  const mark = (style) => h(Text, { style, render: ({ pageNumber, totalPages }) => {
    // react-pdf calls render once while laying out (no totalPages yet) and once while drawing each page: report the latter
    if (Number.isInteger(totalPages)) onWatermarkPage?.({ pageNumber, totalPages });
    return labels.watermark;
  } });
  const metaLine = [meta.segment && `Segment ${meta.segment}`, meta.format, meta.shoot_date].filter(Boolean).join(' · ');
  return h(Document, { title: `${title} — ${labels.watermark}`, language: 'vi' },
    h(Page, { size: 'A4', wrap: true, style: s.page },
      h(View, { fixed: true, style: s.header }, mark(s.headerText)),
      h(View, { fixed: true, style: s.diagonal }, h(Text, { style: s.diagonalText }, labels.watermark)),
      h(Text, { fixed: true, style: s.footer, render: ({ pageNumber, totalPages }) => labels.page(pageNumber, totalPages) }),
      h(Text, { style: s.title }, title),
      metaLine ? h(Text, { style: s.meta }, metaLine) : null,
      h(View, { style: s.colHeads, fixed: false }, h(Text, { style: s.idx }, '#'), h(Text, { style: s.col }, labels.english), h(Text, { style: s.col }, labels.vietnamese)),
      ...paragraphs.map(p => h(View, { key: p.idx, style: s.row, wrap: false, 'data-paragraph': p.idx, 'data-status': p.status },
        h(Text, { style: s.idx }, String(p.idx)),
        h(Text, { style: s.col }, p.source_text),
        h(View, { style: s.col }, h(Text, null, p.target_text || ''), p.status === 'reviewed' ? null : h(Text, { style: s.flag }, labels.notProofread)))))
  );
}

/** → Buffer of the PDF. */
export async function renderBilingualPdf(input, options = {}) {
  registerFonts();
  return renderToBuffer(buildBilingualDocument(input, options));
}
