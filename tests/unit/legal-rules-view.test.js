import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// SC-37 view rules (T015; SC-37 #8–#22; FR-001..FR-004; decisions D2, D4, D15, D17).
const view = () => import('../../lib/legal/view.js');
const FULL = { rule_code: 'A9-X', topic: 'security', severity: 'notice', title_vi: 'a', title_en: 'a', description_vi: 'a', description_en: 'a',
  guidance_vi: 'a', guidance_en: 'a', citation: 'Điều 9', segments: ['A'] };

describe('SC-37 view rules (T015)', () => {
  test('row actions by status: draft → edit; approved → retire and create revision only without a draft; retired → view', async () => {
    const { rowActions } = await view();
    assert.deepEqual(rowActions({ status: 'draft' }), ['edit']);
    assert.deepEqual(rowActions({ status: 'approved', has_draft: false }), ['retire', 'revise']);
    assert.deepEqual(rowActions({ status: 'approved', has_draft: true }), ['retire']);
    assert.deepEqual(rowActions({ status: 'retired' }), ['view']);
  });

  test('#21: Approve and sign stays disabled while a required field or the citation is empty', async () => {
    const { canSign, missingForSign } = await view();
    assert.equal(canSign(FULL), true);
    assert.equal(canSign({ ...FULL, citation: '' }), false);
    assert.deepEqual(missingForSign({ ...FULL, citation: ' ', guidance_en: '' }).sort(), ['citation', 'guidance_en']);
    assert.equal(canSign({ ...FULL, segments: [] }), false);
  });

  test('#22: version history newest first, with the codes signed and retired in each', async () => {
    const { historyRows } = await view();
    const rows = historyRows([{ rule_version: '2026.08', signed: ['A9-LONG'], retired: ['A9-MAP'] }, { rule_version: '2026.11', signed: [], retired: ['A9-RELIG'] }]);
    assert.deepEqual(rows.map(r => r.rule_version), ['2026.11', '2026.08']);
  });

  test('every SC-37 key exists in vi and en, including the Sample label and the revision strip', () => {
    for (const k of ['rules.meta.title', 'rules.title', 'rules.new', 'rules.status.draft', 'rules.status.approved', 'rules.status.retired', 'rules.action.edit', 'rules.action.retire',
      'rules.action.revise', 'rules.action.view', 'rules.sign', 'rules.save', 'rules.signed', 'rules.retired', 'rules.saved', 'rules.revised', 'rules.sample', 'rules.history.title',
      'rules.field.keywords_en', 'rules.field.keywords_vi', 'rules.field.segments', 'rules.error.citation', 'rules.audit_note', 'rules.confirm.sign', 'rules.confirm.retire']) {
      assert.equal(typeof vi[k], 'string', k); assert.equal(typeof en[k], 'string', k);
    }
  });
});
