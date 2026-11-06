import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../../lib/db/client.js';

// The M4 seed and schema after D1, D2, D6 (T003): seed files are found by table name, never by their NN prefix.
function seed(table) {
  const file = fs.readdirSync('data/seed').find(f => new RegExp(`^\\d+_${table}\\.csv$`).test(f));
  assert.ok(file, `seed file of ${table}`);
  const [head, ...rows] = parseCsv(fs.readFileSync(path.join('data/seed', file), 'utf8'));
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const schema = fs.readFileSync('data/schema/schema-M4.sql', 'utf8');
const GROUPS = ['full_production', 'permits_paperwork', 'casting', 'crew', 'camera_lighting', 'studios_interiors', 'location_management',
  'transport_logistics', 'lodging_catering', 'interpreting', 'insurance_legal', 'post_production'];
const users = Object.fromEntries(seed('user_account').map(u => [u.user_id, u]));
const orgs = seed('organisation');
const orgName = (id) => orgs.find(o => o.org_id === id)?.org_name;
const monthsLater = (d, n) => { const x = new Date(`${d}T00:00:00Z`); const day = x.getUTCDate(); x.setUTCDate(1); x.setUTCMonth(x.getUTCMonth() + n);
  const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate(); x.setUTCDate(Math.min(day, last)); return x.toISOString().slice(0, 10); };

describe('M4 seed and schema (T003)', () => {
  test('D1: organisation_user links each seed partner account to its organisation', () => {
    assert.match(schema, /CREATE TABLE organisation_user \([\s\S]*?CONSTRAINT pk_organisation_user PRIMARY KEY \(org_id, user_id\)/);
    assert.match(schema, /fk_organisation_user_org_id FOREIGN KEY \(org_id\) REFERENCES organisation/);
    assert.match(schema, /fk_organisation_user_user_id FOREIGN KEY \(user_id\) REFERENCES user_account/);
    const links = seed('organisation_user');
    for (const l of links) assert.equal(users[l.user_id].role, 'partner', l.user_id);
    for (const u of Object.values(users).filter(u => u.role === 'partner')) assert.ok(links.some(l => l.user_id === u.user_id), u.email);
    const byEmail = Object.fromEntries(links.map(l => [users[l.user_id].email.split('@')[0], orgName(l.org_id)]));
    assert.deepEqual(byEmail, { 'lan.pham': 'Bến Xưa Production Services', 'khai.do': 'Đò Ngang Film Services', 'tuan.huynh': 'Mekong Frame Co.' });
    assert.equal(links.some(l => orgName(l.org_id) === 'Hanoi Grip & Light'), false, 'empty case');
  });

  test('D2: partner_invitation keeps only a code hash; accepted, open and expired invitations exist', () => {
    assert.match(schema, /code_hash CHAR\(64\) NOT NULL/);
    assert.match(schema, /uq_partner_invitation_code_hash UNIQUE \(code_hash\)/);
    const invitations = seed('partner_invitation');
    const hashes = invitations.map(i => i.code_hash);
    assert.equal(new Set(hashes).size, hashes.length);
    for (const i of invitations) {
      assert.match(i.code_hash, /^[0-9a-f]{64}$/, i.email);
      assert.ok(i.expires_at > i.invited_at, i.email);
      assert.equal(i.accepted_at === '', i.accepted_by === '', i.email);
      assert.ok(['vfda_staff', 'admin'].includes(users[i.invited_by].role), `${i.email}: invited by staff or admin (SYS BR-002, 06/11/2026)`);
    }
    assert.ok(invitations.some(i => i.accepted_at), 'accepted');
    const open = invitations.filter(i => !i.accepted_at && i.expires_at > '2026-11-06');
    assert.ok(open.some(i => orgName(i.org_id) === 'Hanoi Grip & Light'), 'open invitation for Hanoi Grip & Light');
    assert.ok(invitations.some(i => !i.accepted_at && i.expires_at < '2026-11-06'), 'expired');
  });

  test('analysis G5: Bến Xưa\'s role.grant audit row matches its accepted invitation', () => {
    const lan = Object.values(users).find(u => u.email.startsWith('lan.pham'));
    const invitation = seed('partner_invitation').find(i => i.accepted_by === lan.user_id);
    const grant = seed('audit_log').find(a => a.action === 'role.grant' && a.target_id === lan.user_id);
    assert.ok(invitation && grant);
    assert.equal(grant.admin_id, invitation.invited_by);
  });

  test('D6: verification requests carry submitted_at and decided_at, in order; the latest approval is the badge start', () => {
    assert.match(schema, /submitted_at TIMESTAMPTZ NOT NULL/);
    assert.match(schema, /ck_verification_request_decided CHECK \(\(status = 'pending'\) = \(decided_at IS NULL\)\)/);
    const latest = {};
    for (const v of seed('verification_request')) {
      assert.ok(v.submitted_at, v.request_id);
      assert.equal(v.status === 'pending', v.decided_at === '', v.request_id);
      if (v.decided_at) assert.ok(v.decided_at > v.submitted_at, v.request_id);
      if (v.status === 'approved' && v.decided_at > (latest[v.org_id] || '')) latest[v.org_id] = v.decided_at;
    }
    for (const [orgId, at] of Object.entries(latest)) assert.equal(orgs.find(o => o.org_id === orgId).verified_at, at, orgName(orgId));
  });

  test('BR-002, BR-004, BR-005, BR-008 still hold in the seed', () => {
    for (const o of orgs) {
      for (const g of JSON.parse(o.service_groups)) assert.ok(GROUPS.includes(g), `${o.org_name}: ${g}`);
      if (o.verified_at) assert.equal(o.verified_until, monthsLater(o.verified_at.slice(0, 10), 12), o.org_name);
    }
    const gone = new Set(orgs.filter(o => o.org_status === 'deactivated').map(o => o.org_id));
    for (const r of seed('collab_request')) {
      assert.equal(r.status === 'confirmed', r.confirmed_at !== '', r.request_id);
      if (gone.has(r.org_id)) assert.ok(['declined', 'withdrawn', 'confirmed'].includes(r.status), r.request_id);
    }
  });
});
