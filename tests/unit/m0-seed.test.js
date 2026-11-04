import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCsv } from '../../lib/db/client.js';

// The seed after decisions D1 (gauge rows) and D2 (owner) of specs/005-m0-workspace/plan.md, read directly
function table(file) {
  const [header, ...rows] = parseCsv(fs.readFileSync(`data/seed/${file}`, 'utf8'));
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ''])));
}
const REQUIREMENTS = table('08_segment_requirement.csv');
const PROJECTS = table('09_project.csv');
const MEMBERS = table('11_project_member.csv');
const gaugeRows = (segment) => REQUIREMENTS.filter(r => r.segment === segment && r.requirement_code.startsWith('GAUGE_'));
const needed = (rows) => rows.filter(r => r.needed === 'true').map(r => r.requirement_code).sort();
const notNeeded = (rows) => rows.filter(r => r.needed === 'false').map(r => r.requirement_code).sort();

describe('M0 seed after D1 and D2 (T002, BR-002, BR-004, FR-001, Clarifications Q1)', () => {
  for (const segment of ['A', 'B']) {
    test(`BR-002, Q1: segment ${segment} counts four gauges and shows Logistics without counting it`, () => {
      const rows = gaugeRows(segment);
      assert.deepEqual(needed(rows), ['GAUGE_CONTENT', 'GAUGE_DOSSIER', 'GAUGE_LOCATIONS', 'GAUGE_PARTNERS']);
      assert.deepEqual(notNeeded(rows), ['GAUGE_LOGISTICS']);
    });
  }

  test('BR-002, Q1: segment C has no Dossier & permits gauge row; it counts three gauges and shows Logistics without counting it', () => {
    const rows = gaugeRows('C');
    assert.ok(!rows.some(r => r.requirement_code === 'GAUGE_DOSSIER'), 'C must not have GAUGE_DOSSIER');
    assert.deepEqual(needed(rows), ['GAUGE_CONTENT', 'GAUGE_LOCATIONS', 'GAUGE_PARTNERS']);
    assert.deepEqual(notNeeded(rows), ['GAUGE_LOGISTICS']);
  });

  test('BR-004: every gauge row carries both labels, so the screens never hard-code a gauge name', () => {
    const rows = REQUIREMENTS.filter(r => r.requirement_code.startsWith('GAUGE_'));
    assert.equal(rows.length, 14);
    for (const r of rows) assert.ok(r.label_vi && r.label_en, `${r.segment} ${r.requirement_code}`);
  });

  test('D2: ck_project_member_permission in data/schema/schema-M0.sql allows owner, view and edit', () => {
    const sql = fs.readFileSync('data/schema/schema-M0.sql', 'utf8');
    const check = sql.match(/CONSTRAINT ck_project_member_permission CHECK \(permission IN \(([^)]*)\)\)/);
    assert.ok(check, 'ck_project_member_permission not found');
    assert.deepEqual(check[1].split(',').map(v => v.trim().replace(/'/g, '')).sort(), ['edit', 'owner', 'view']);
  });

  test('FR-001, D2: every seed project has exactly one owner, accepted and linked to an account', () => {
    for (const project of PROJECTS) {
      const owners = MEMBERS.filter(m => m.project_id === project.project_id && m.permission === 'owner');
      assert.equal(owners.length, 1, `${project.project_name}: ${owners.length} owners`);
      assert.equal(owners[0].invite_status, 'accepted', project.project_name);
      assert.ok(owners[0].user_id, `${project.project_name}: owner without an account`);
    }
  });

  test('D2: a pending invitation is never the owner', () => {
    for (const m of MEMBERS.filter(m => m.invite_status === 'pending')) assert.notEqual(m.permission, 'owner', m.invitee_email);
  });
});
