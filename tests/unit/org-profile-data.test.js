import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getOne } from '../../lib/db/client.js';

// The partner's own organisation on node:sqlite (T035, FR-001, BR-001, BR-002, SR-326, D3).
const partners = () => import('../../lib/db/partners.js');
const input = () => import('../../lib/partners/input.js');
const LAN = { role: 'partner', isAuthenticated: true, userId: 'ccc2764e-7734-5390-9c71-46963d2f7820' };   // Bến Xưa
const TUAN = { role: 'partner', isAuthenticated: true, userId: '1396ef42-92a1-55ca-bfd0-199050d5411b' };  // Mekong Frame
const YUI = { role: 'member', isAuthenticated: true, userId: '118de3c8-88eb-5003-a2f9-26bbdd0186ae' };
const BEN_XUA = '67fc4355-67c0-55f3-a64b-1ad3381c6fdf';

describe('My organisation on node:sqlite (T035)', () => {
  test('FR-001: a partner reads its own organisation with all three layers and its verification state', async () => {
    const { getMyOrganisation } = await partners();
    const mine = await getMyOrganisation(LAN);
    assert.equal(mine.organisation.org_id, BEN_XUA);
    assert.ok(mine.member && mine.private, 'layers 2 and 3');
    assert.equal(mine.verification.status, 'approved');
    await assert.rejects(() => getMyOrganisation(YUI), (e) => e.code === 'FORBIDDEN');
  });

  test('BR-001: each field is written to its own table; the change is live at once (D3)', async () => {
    const { saveOrgProfile, getProfile } = await partners();
    const { validateOrgProfile } = await input();
    const { ok, value } = validateOrgProfile({ org_name: 'Bến Xưa Production Services', capability_desc_en: 'Night shoots in Hội An and Ninh Bình.',
      rate_card: [{ item: 'Line producer', amount: 7000000, unit: 'day' }], direct_contact: 'Phạm Ngọc Lan · +84 000 000 121' });
    assert.ok(ok);
    await saveOrgProfile(LAN, value);
    assert.equal(getOne('SELECT capability_desc_en AS v FROM organisation_member_layer WHERE org_id = ?', [BEN_XUA]).v, 'Night shoots in Hội An and Ninh Bình.');
    assert.deepEqual(JSON.parse(getOne('SELECT rate_card AS v FROM organisation_private_layer WHERE org_id = ?', [BEN_XUA]).v),
      [{ item: 'Line producer', amount: 7000000, unit: 'day', currency: 'VND' }]);
    assert.equal(getOne('SELECT direct_contact AS v FROM organisation_private_layer WHERE org_id = ?', [BEN_XUA]).v, 'Phạm Ngọc Lan · +84 000 000 121');
    assert.equal((await getProfile(YUI, 'benxua')).member.capability_desc_en, 'Night shoots in Hội An and Ninh Bình.', 'no moderation in this slice (D3)');
  });

  test('BR-002, SR-326: no group outside the 12; the badge, the Article 13 flag, the status and the slug are refused', async () => {
    const { validateOrgProfile } = await input();
    assert.equal(validateOrgProfile({ service_groups: ['visa'] }).errors.service_groups, 'partners.error.service_groups');
    for (const field of ['verified_at', 'verified_until', 'art13_eligible', 'org_status', 'slug']) {
      assert.equal(validateOrgProfile({ [field]: 'x' }).errors[field], 'partners.error.vfda_only', field);
    }
  });

  test('a partner only ever writes its own organisation; a member cannot write any', async () => {
    const { saveOrgProfile } = await partners();
    await saveOrgProfile(TUAN, { capability_desc_en: 'Mekong only' });
    assert.notEqual(getOne('SELECT capability_desc_en AS v FROM organisation_member_layer WHERE org_id = ?', [BEN_XUA]).v, 'Mekong only');
    await assert.rejects(() => saveOrgProfile(YUI, { capability_desc_en: 'x' }), (e) => e.code === 'FORBIDDEN');
  });
});
