import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import vi from '../../lib/i18n/vi.json' with { type: 'json' };
import en from '../../lib/i18n/en.json' with { type: 'json' };

// SC-21, SC-22 and SC-36 view rules (T039, FR-001, FR-008..FR-010, BR-004, SR-326, SR-332, SR-333, SR-132).
const partnerView = () => import('../../app/partners/me/partner-view.js');
const queueView = () => import('../../app/admin/verification/queue-view.js');

describe('SC-21 my organisation (T039)', () => {
  test('#17: Save only when something changed and #4–#7 are valid; badge and Article 13 are never editable (SR-326)', async () => {
    const { canSave, EDITABLE_FIELDS } = await partnerView();
    const base = { org_name: 'Bến Xưa', legal_form: 'Công ty TNHH', founded_year: 2012, hq_province: 1, service_groups: ['crew'], provinces: [1] };
    assert.equal(canSave(base, base), false, 'nothing changed');
    assert.equal(canSave(base, { ...base, org_name: 'Bến Xưa Films' }), true);
    assert.equal(canSave(base, { ...base, org_name: '' }), false);
    assert.equal(canSave(base, { ...base, service_groups: [] }), false);
    assert.equal(canSave(base, { ...base, provinces: [] }), false);
    for (const f of ['verified_at', 'verified_until', 'art13_eligible', 'org_status', 'slug']) assert.equal(EDITABLE_FIELDS.includes(f), false, f);
  });

  test('#15: Preview as Guest / Member / Accepted shows exactly the layers of each viewer', async () => {
    const { previewAs } = await partnerView();
    const mine = { organisation: { org_id: 'o', slug: 's', org_name: 'N', legal_form: 'L', service_groups: ['crew'], provinces: [1], verified_until: null, org_status: 'active' },
      member: { capability_desc_en: 'C', portfolio: [], intl_project_count: 1, working_languages: [] }, private: { rate_card: [], past_clients: [], direct_contact: 'X' } };
    assert.deepEqual(previewAs(mine, 'guest').layers, { public: true, member: false, private: false });
    assert.deepEqual(previewAs(mine, 'member').layers, { public: true, member: true, private: false });
    assert.deepEqual(previewAs(mine, 'accepted').layers, { public: true, member: true, private: true });
  });

  test('#11, SR-132: the portfolio field says to describe the work without project titles, in both languages', async () => {
    const { PORTFOLIO_HINT } = await partnerView();
    assert.match(en[PORTFOLIO_HINT], /without (the )?project (titles|names)/i);
    assert.match(vi[PORTFOLIO_HINT], /không (ghi|nêu) tên dự án/i);
  });
});

describe('SC-22 submit verification (T039)', () => {
  test('#7, #8, SR-332: the checklist and Submit — a PDF ≤ 25 MB, two references, nothing pending', async () => {
    const { checklist, canSubmit } = await partnerView();
    const ready = { file: { size: 1024, type: 'application/pdf' }, references: ['A', 'B', ''], pending: false };
    assert.deepEqual(checklist(ready), { file: true, references: true, not_pending: true });
    assert.equal(canSubmit(ready), true);
    assert.equal(canSubmit({ ...ready, file: { size: 26 * 1024 * 1024, type: 'application/pdf' } }), false);
    assert.equal(canSubmit({ ...ready, file: { size: 1024, type: 'image/png' } }), false);
    assert.equal(canSubmit({ ...ready, references: ['A', ' '] }), false);
    assert.equal(canSubmit({ ...ready, pending: true }), false);
  });

  test('#10, SR-333, BR-004: what VFDA checks — and what it does not — names quality and prices in both languages', async () => {
    const { CHECKS_KEYS } = await partnerView();
    assert.match(CHECKS_KEYS.map(k => en[k]).join(' '), /quality[\s\S]*price|price[\s\S]*quality/i);
    assert.match(CHECKS_KEYS.map(k => vi[k]).join(' '), /chất lượng[\s\S]*giá|giá[\s\S]*chất lượng/i);
  });
});

describe('SC-36 verification queue (T039)', () => {
  test('#11: the approval preview is the decision day + 12 months (Vietnam date)', async () => {
    const { approvalPreview } = await queueView();
    assert.deepEqual(approvalPreview(new Date('2026-11-06T02:00:00Z')), { from: '2026-11-06', until: '2027-11-06' });
    assert.deepEqual(approvalPreview(new Date('2028-02-29T02:00:00Z')), { from: '2028-02-29', until: '2029-02-28' });
  });

  test('#12, #10: Reject needs a reason; the Article 13 switch needs the business-line box', async () => {
    const { canReject, canSwitchArt13On } = await queueView();
    assert.equal(canReject(''), false);
    assert.equal(canReject('   '), false);
    assert.equal(canReject('Not legible'), true);
    assert.equal(canReject('x'.repeat(1001)), false);
    assert.equal(canSwitchArt13On(false), false);
    assert.equal(canSwitchArt13On(true), true);
  });
});
