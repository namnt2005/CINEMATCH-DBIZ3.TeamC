import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../../lib/db/client.js';

// The M7 seed and schema after decisions D1, D2, D5 of specs/006-m7-support/plan.md (T003).
// Seed files are found by table name: the NN prefix is the load order and moves when a table is added.
function table(name) {
  const file = fs.readdirSync('data/seed').find(f => new RegExp(`^\\d{2}_${name}\\.csv$`).test(f));
  assert.ok(file, `no seed file for ${name}`);
  const [header, ...rows] = parseCsv(fs.readFileSync(path.join('data/seed', file), 'utf8'));
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ''])));
}
const schema = fs.readFileSync('data/schema/schema-M7.sql', 'utf8');
const check = (name) => {
  const m = schema.match(new RegExp(`CONSTRAINT ${name} CHECK \\(\\w+ IN \\(([^)]*)\\)\\)`));
  assert.ok(m, `${name} not found`);
  return m[1].split(',').map(v => v.trim().replace(/'/g, '')).sort();
};

describe('M7 schema and seed after D1, D2, D5 (T003, BR-001, BR-003, BR-005)', () => {
  test('D1: review_status, recipient and the delivery_status with downloaded', () => {
    assert.deepEqual(check('ck_province_notice_review_status'), ['approved', 'changes_requested', 'draft', 'submitted']);
    assert.deepEqual(check('ck_province_notice_recipient'), ['culture_department', 'peoples_committee']);
    assert.deepEqual(check('ck_province_notice_delivery_status'), ['bounced', 'downloaded', 'queued', 'sent']);
    for (const col of ['review_note TEXT', 'response_recorded_by UUID']) assert.match(schema, new RegExp(`\\b${col}\\b`), col);
  });

  test('D2: consultation_booking has preferred_times', () => {
    assert.match(schema, /CREATE TABLE consultation_booking \([\s\S]*?\bpreferred_times\b[\s\S]*?\);/);
  });

  const notices = () => table('province_notice');
  const interests = () => Object.fromEntries(table('location_interest').map(i => [i.interest_id, i]));

  test('BR-001: an approved notice has its reviewer; a downloaded one is approved with sent_at', () => {
    assert.ok(notices().some(n => n.review_status === 'approved'), 'the seed has approved notices');
    assert.ok(notices().some(n => n.delivery_status === 'downloaded'), 'the seed has downloaded notices');
    for (const n of notices()) {
      if (n.review_status === 'approved') assert.ok(n.reviewed_by, n.interest_id);
      if (n.delivery_status === 'downloaded') {
        assert.equal(n.review_status, 'approved', n.interest_id);
        assert.ok(n.sent_at, n.interest_id);
      }
    }
  });

  test('R6: a notice with changes requested carries the staff note', () => {
    const asked = notices().filter(n => n.review_status === 'changes_requested');
    assert.ok(asked.length > 0, 'the seed has a notice with changes requested');
    for (const n of asked) assert.ok(n.review_note, n.interest_id);
  });

  test('BR-003: a reply only on a downloaded notice', () => {
    for (const n of notices().filter(n => n.response)) assert.equal(n.delivery_status, 'downloaded', n.interest_id);
  });

  test('D5: at most one notice per project and province', () => {
    const byKey = {};
    const interest = interests();
    for (const n of notices()) {
      const key = `${interest[n.interest_id].project_id}:${n.province_id}`;
      byKey[key] = (byKey[key] || 0) + 1;
    }
    for (const [key, count] of Object.entries(byKey)) assert.equal(count, 1, key);
  });

  test('R6: the staff queue has rows — at least one submitted and one changes_requested notice', () => {
    const states = new Set(notices().map(n => n.review_status));
    assert.ok(states.has('submitted'));
    assert.ok(states.has('changes_requested'));
  });

  test('D2, BR-005: every booking has 1–3 preferred times, the first equal to slot_start', () => {
    for (const b of table('consultation_booking')) {
      const times = JSON.parse(b.preferred_times || '[]');
      assert.ok(times.length >= 1 && times.length <= 3, b.booking_id);
      assert.equal(Date.parse(times[0]), Date.parse(b.slot_start), b.booking_id);
    }
  });
});
