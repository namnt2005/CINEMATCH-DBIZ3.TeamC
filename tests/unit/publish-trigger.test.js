import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDb, closeDatabase } from '../../lib/db/client.js';

const MUI_NE = '162abff9-9986-52d0-80a6-75fd4e7403f5'; // awaiting_contact, contact not verified
const CUA_VAN = 'ae2760b4-7a9b-5528-a202-39e5a1d456f0'; // unpublished, contact verified
const TRANG_AN = '607132bd-b05b-52c6-900f-5f2928c17a9e'; // published, contact verified

const statusOf = (id) => getDb().prepare('SELECT intake_status FROM location WHERE location_id = ?').get(id).intake_status;
const publishSql = "UPDATE location SET intake_status = 'published', published = 'true' WHERE location_id = ?";

describe('BR-004 database constraint trg_location_publish_needs_contact (T004, US-3 Scenario 1, FR-005, SR-311)', () => {
  beforeEach(() => closeDatabase());

  test('BR-004: the triggers exist once the database is loaded', () => {
    const names = getDb().prepare("SELECT name FROM sqlite_master WHERE type = 'trigger'").all().map(r => r.name);
    assert.ok(names.some(n => n.startsWith('trg_location_publish_needs_contact')), 'publish trigger');
    assert.ok(names.some(n => n.startsWith('trg_audit_log_append_only')), 'audit trigger');
  });

  test('BR-004 / US-3 Scenario 1: a direct SQL update cannot publish Mũi Né while its contact is not verified', () => {
    assert.throws(() => getDb().prepare(publishSql).run(MUI_NE), /BR-004/);
    assert.equal(statusOf(MUI_NE), 'awaiting_contact');
  });

  test('BR-004: a location cannot be inserted already published (no contact can exist before it)', () => {
    const insert = () => getDb().prepare(`
      INSERT INTO location (location_id, slug, province_id, name_vi, name_en, lat, lng, scene_types, desc_vi, desc_en,
        crew_capacity, lodging_20km, grid_power, truck_access, permit_complexity, availability, intake_status, published)
      VALUES ('00000000-0000-4000-8000-000000000099', 'test-insert', 19, 'Thử', 'Test', 20.3, 105.9, '["river"]', 'x', 'y',
        'u15', 'true', 'true', 'true', 'low', 'open', 'published', 'true')
    `).run();
    assert.throws(insert, /BR-004/);
  });

  test('FR-005: a location whose contact is verified (Cửa Vạn) can be published', () => {
    getDb().prepare(publishSql).run(CUA_VAN);
    assert.equal(statusOf(CUA_VAN), 'published');
  });

  test('D4: editing the contact of a published location does not unpublish it, and later saves are not blocked', () => {
    const db = getDb();
    db.prepare("UPDATE authority_contact SET contact_verified = 'false', verified_at = NULL WHERE location_id = ?").run(TRANG_AN);
    db.prepare("UPDATE location SET desc_en = 'Still published.' WHERE location_id = ?").run(TRANG_AN);
    db.prepare(publishSql).run(TRANG_AN); // already published: no new publish, not blocked
    assert.equal(statusOf(TRANG_AN), 'published');
  });

  test('BR-004: the seed still loads 11 locations, 9 published, with the triggers in place', () => {
    const counts = getDb().prepare('SELECT intake_status, count(*) AS n FROM location GROUP BY intake_status').all();
    const byStatus = Object.fromEntries(counts.map(r => [r.intake_status, r.n]));
    assert.deepEqual(byStatus, { awaiting_contact: 1, published: 9, unpublished: 1 });
  });
});
