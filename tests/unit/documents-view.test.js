import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// SC-26 view rules (T017; M5 BR-003, Q1, SR-153, SC-26 #7–#12; analysis I3, G1, U3).
const vi = JSON.parse(fs.readFileSync('lib/i18n/vi.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('lib/i18n/en.json', 'utf8'));
const view = () => import('../../lib/documents/view.js');
const row = (extra) => ({ doc_code: 'FOREIGN_CREW_LIST', basis: 'common', state: 'missing', awaiting_confirmation: false, template_url: null, latest: null, ...extra });

describe('SC-26 view rules (T017)', () => {
  test('basis labels, the awaiting label and the state keys shared with SC-27', async () => {
    const { basisKey, stateKey, awaitingKey } = await view();
    assert.equal(en[basisKey('law')], 'Required by law');
    assert.equal(en[basisKey('common')], 'Commonly requested');
    assert.equal(en[basisKey('location')], 'Location-specific');
    assert.equal(awaitingKey(row({ awaiting_confirmation: true })), 'documents.awaiting');
    assert.equal(awaitingKey(row()), null);
    for (const s of ['present', 'needs_fix', 'pending', 'missing']) assert.equal(stateKey(s), `dossier.state.${s}`);
  });

  test('template: a link only with a real template; the seed placeholders show "template pending VFDA"', async () => {
    const { templateView } = await view();
    assert.deepEqual(templateView(null), { href: null, pendingKey: null });
    assert.deepEqual(templateView('https://storage.cinematch.example/templates/a13_application.docx'), { href: null, pendingKey: 'documents.template.pending' });
    assert.deepEqual(templateView('https://vfda.example.vn/forms/a13.docx'), { href: 'https://vfda.example.vn/forms/a13.docx', pendingKey: null });
  });

  test('row actions: upload or replace for editors, view once a file exists, Draft bilingual on every row (I3)', async () => {
    const { rowActions } = await view();
    assert.deepEqual(rowActions(row(), { editable: true }), ['upload', 'draft']);
    assert.deepEqual(rowActions(row({ latest: { document_id: 'x' } }), { editable: true }), ['view', 'replace', 'draft']);
    assert.deepEqual(rowActions(row({ latest: { document_id: 'x' } }), { editable: false }), ['view', 'draft']);
    assert.ok(rowActions(row({ doc_code: 'A13_SERVICE_AGREEMENT', basis: 'law' }), { editable: true }).includes('request'), 'component c → View request');
  });

  test('U3, G1: the provincial notice copy never offers upload or replace — only the SC-32 link (open while missing, view once present)', async () => {
    const { rowActions } = await view();
    assert.deepEqual(rowActions(row({ doc_code: 'PROVINCIAL_NOTICE_COPY', state: 'missing' }), { editable: true }), ['notice', 'draft']);
    assert.deepEqual(rowActions(row({ doc_code: 'PROVINCIAL_NOTICE_COPY', state: 'present' }), { editable: true }), ['notice_view', 'draft']);
  });

  test('progress text and bar: present / total', async () => {
    const { progressView } = await view();
    assert.deepEqual(progressView({ present: 3, total: 7 }), { present: 3, total: 7, pct: 43 });
    assert.deepEqual(progressView({ present: 0, total: 0 }), { present: 0, total: 0, pct: 0 });
  });

  test('every key used exists in vi.json and en.json; no banned word in the documents.* texts', async () => {
    const { DOCUMENTS_KEYS } = await view();
    assert.ok(DOCUMENTS_KEYS.length >= 25);
    for (const k of DOCUMENTS_KEYS) { assert.ok(vi[k], `vi ${k}`); assert.ok(en[k], `en ${k}`); }
    for (const k of DOCUMENTS_KEYS.filter(k => k.startsWith('documents.'))) {
      assert.doesNotMatch(en[k], /\b(approved|accepted|legally compliant|safe)\b/i, k);
      assert.doesNotMatch(vi[k], /an toàn|đã được duyệt|hợp pháp/i, k);
    }
  });

  test('the module imports nothing from node: (it is used by a client component)', () => {
    assert.doesNotMatch(fs.readFileSync('lib/documents/view.js', 'utf8'), /from ['"]node:/);
  });
});
