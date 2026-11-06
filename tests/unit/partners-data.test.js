import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Directory and profile layers on node:sqlite (T014, FR-002, FR-003, FR-005, FR-006, BR-001, BR-002, BR-004).
// Expected values are computed from the seed files (found by table name), never typed from the scenario text.
const partners = () => import('../../lib/db/partners.js');
const TODAY = '2026-11-06';
const GUEST = { role: 'guest', isAuthenticated: false, userId: null };
const member = (userId) => ({ role: 'member', isAuthenticated: true, userId });
const YUI = member('118de3c8-88eb-5003-a2f9-26bbdd0186ae');      // owner of Lantern Street; on no request to Bến Xưa
const PARK = member('4ef79de6-8efb-58f7-8514-9c0532345ac4');     // owner of The Last Ferry (accepted request to Bến Xưa, both NDA rows)
const JIWOO = member('b9916111-9b75-5ab9-b88c-4d578a87cd46');    // edit member of The Last Ferry only
const LAN = { role: 'partner', isAuthenticated: true, userId: 'ccc2764e-7734-5390-9c71-46963d2f7820' }; // Bến Xưa
const BEN_XUA = '67fc4355-67c0-55f3-a64b-1ad3381c6fdf';
const HA_LONG_MARINE = 'e6e8e5aa-0428-517d-9432-f03f98f612a8';  // under_review request of The Last Ferry with the producer NDA only

function seed(table) {
  const file = fs.readdirSync('data/seed').find(f => new RegExp(`^\\d+_${table}\\.csv$`).test(f));
  const [head, ...lines] = parseCsv(fs.readFileSync(path.join('data/seed', file), 'utf8'));
  return lines.filter(l => l.length > 1).map(l => Object.fromEntries(head.map((h, i) => [h, l[i]])));
}
function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c; }
    else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const orgs = seed('organisation');
const memberLayers = Object.fromEntries(seed('organisation_member_layer').map(r => [r.org_id, r]));
const verifiedToday = (o) => Boolean(o.verified_until) && o.verified_until >= TODAY;
const slugOf = (orgId) => orgs.find(o => o.org_id === orgId).slug;

describe('Directory and profiles on node:sqlite (T014)', () => {
  test('US-1 Scenario 1: Full production + Ninh Bình + Korean + Verified lists exactly the matching verified organisations, with their month', async () => {
    const { listDirectory } = await partners();
    const expected = orgs.filter(o => o.org_status !== 'deactivated' && verifiedToday(o)
      && JSON.parse(o.service_groups).includes('full_production') && JSON.parse(o.provinces).includes(19)
      && JSON.parse(memberLayers[o.org_id]?.working_languages || '[]').includes('ko')).map(o => o.slug).sort();
    assert.ok(expected.length >= 2, 'the seed has matching organisations (the test is not vacuous)');
    const { organisations } = await listDirectory(YUI, { group: 'full_production', province: 19, language: 'ko', verified_only: true }, { today: TODAY });
    assert.deepEqual(organisations.map(o => o.slug).sort(), expected);
    for (const o of organisations) assert.match(o.verified_month, /^\d{4}-\d{2}$/, o.slug);
  });

  test('US-1 Scenario 2: a guest gets no member-layer field and the language filter is ignored (research Open question 7)', async () => {
    const { listDirectory } = await partners();
    const { organisations } = await listDirectory(GUEST, { group: 'full_production', province: 19, language: 'ko', verified_only: true }, { today: TODAY });
    const withoutLanguage = orgs.filter(o => o.org_status !== 'deactivated' && verifiedToday(o)
      && JSON.parse(o.service_groups).includes('full_production') && JSON.parse(o.provinces).includes(19)).map(o => o.slug).sort();
    assert.deepEqual(organisations.map(o => o.slug).sort(), withoutLanguage);
    for (const o of organisations) {
      assert.equal('member' in o, false, `${o.slug} has no member field`);
      assert.equal(JSON.stringify(o).includes('working_languages'), false);
      assert.equal(JSON.stringify(o).includes('intl_project_count'), false);
    }
  });

  test('Verified only is the default; Sông Hậu (badge ended 15/08/2026) is unverified even with an open request; deactivated never listed', async () => {
    const { listDirectory } = await partners();
    const byDefault = (await listDirectory(YUI, {}, { today: TODAY })).organisations.map(o => o.slug);
    const all = (await listDirectory(YUI, { verified_only: false }, { today: TODAY })).organisations;
    const songHau = orgs.find(o => o.org_name.startsWith('Sông Hậu'));
    const cuuLong = orgs.find(o => o.org_status === 'deactivated');
    assert.ok(seed('collab_request').some(r => r.org_id === songHau.org_id && ['pending', 'under_review', 'info_requested', 'accepted'].includes(r.status)),
      'the seed has an open request to Sông Hậu (§3 edge case, analysis C2)');
    assert.equal(byDefault.includes(songHau.slug), false);
    assert.equal(all.find(o => o.slug === songHau.slug)?.verified, false);
    assert.equal(byDefault.includes(cuuLong.slug) || all.some(o => o.slug === cuuLong.slug), false, 'BR-008');
  });

  test('SC-19 #3: counts for the 12 groups in order over the filtered set; search ignores accents', async () => {
    const { listDirectory } = await partners();
    const { groups } = await listDirectory(YUI, { verified_only: false }, { today: TODAY });
    assert.deepEqual(groups.map(g => g.value), ['full_production', 'permits_paperwork', 'casting', 'crew', 'camera_lighting', 'studios_interiors',
      'location_management', 'transport_logistics', 'lodging_catering', 'interpreting', 'insurance_legal', 'post_production']);
    const active = orgs.filter(o => o.org_status !== 'deactivated');
    assert.equal(groups.find(g => g.value === 'casting').count, active.filter(o => JSON.parse(o.service_groups).includes('casting')).length);
    const found = (await listDirectory(YUI, { q: 'ben xua', verified_only: false }, { today: TODAY })).organisations.map(o => o.slug);
    assert.deepEqual(found, [slugOf(BEN_XUA)]);
  });

  test('BR-001: a guest reads the public layer only — 0 member-layer and 0 private-layer fields', async () => {
    const { getProfile } = await partners();
    const p = await getProfile(GUEST, slugOf(BEN_XUA), { today: TODAY });
    assert.equal(p.public.org_name, orgs.find(o => o.org_id === BEN_XUA).org_name);
    assert.equal(p.member, undefined);
    assert.equal(p.private, undefined);
    assert.deepEqual(p.layers, { public: true, member: false, private: false });
  });

  test('BR-001: a signed-in member without an accepted request and both NDA rows reads the member layer but 0 private-layer rows', async () => {
    const { getProfile } = await partners();
    const p = await getProfile(YUI, slugOf(BEN_XUA), { today: TODAY });
    assert.ok(p.member, 'member layer');
    assert.equal(p.private, undefined);
    assert.deepEqual(p.layers, { public: true, member: true, private: false });
    // The Last Ferry's request to Hạ Long Marine Logistics is under review with the producer's NDA only: still closed.
    // (Park is not used here: as owner of Quiet Harbour Blues, confirmed with Hạ Long Marine and both NDA rows, Park may read it.)
    const halong = await getProfile(JIWOO, slugOf(HA_LONG_MARINE), { today: TODAY });
    assert.equal(halong.private, undefined, 'one NDA row is not enough');
  });

  test('BR-001: the private layer opens only with an accepted request and both NDA rows — and to the organisation itself', async () => {
    const { getProfile } = await partners();
    const park = await getProfile(PARK, slugOf(BEN_XUA), { today: TODAY });
    assert.ok(park.private, 'The Last Ferry: accepted, producer and partner NDA');
    assert.ok('rate_card' in park.private && 'past_clients' in park.private && 'direct_contact' in park.private);
    assert.ok((await getProfile(LAN, slugOf(BEN_XUA), { today: TODAY })).private, 'Bến Xưa reads its own');
  });

  test('SC-20 #10, SR-346: what VFDA checked; unknown slug; a deactivated organisation shows no layer 2 or 3', async () => {
    const { getProfile } = await partners();
    const p = await getProfile(YUI, slugOf(BEN_XUA), { today: TODAY });
    const approved = seed('verification_request').find(v => v.org_id === BEN_XUA && v.status === 'approved');
    assert.deepEqual(p.public.checked.references, JSON.parse(approved.reference_projects));
    await assert.rejects(() => getProfile(YUI, 'no-such-partner', { today: TODAY }), (e) => e.code === 'NOT_FOUND');
    const cuuLong = orgs.find(o => o.org_status === 'deactivated');
    const gone = await getProfile(YUI, cuuLong.slug, { today: TODAY });
    assert.equal(gone.public.active, false);
    assert.equal(gone.member, undefined);
    assert.equal(gone.private, undefined);
  });
});
