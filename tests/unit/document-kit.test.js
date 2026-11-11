import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// The pure kit function (T013; M5 FR-001, BR-003, BR-004, Q1, decision D1, research R1). Rows are built here, so the
// rules are checked without the database: linked to a needed requirement → in; not needed → out; common by segments;
// location-specific only for a shortlisted location's link and the project's segment; groups law → common → location.
const kit = () => import('../../lib/documents/kit.js');
const T = (doc_code, basis, segments, requirement_code = null, awaiting_confirmation = false) =>
  ({ doc_code, name_vi: `${doc_code} vi`, name_en: `${doc_code} en`, basis, segments, requirement_code, awaiting_confirmation, template_url: null });
const TYPES = [
  T('LAW_A', 'law', ['A', 'B'], 'LICENCE'),
  T('AGREEMENT', 'law', ['A', 'B'], 'SERVICE'),
  T('CREW', 'common', ['A', 'B']),
  T('HERITAGE', 'location', ['A', 'B']),
  T('C_CONTRACT', 'common', ['C'], 'C_SERVICE', true),
  T('C_SCHEDULE', 'common', ['C'], null, true),
  T('C_PUBLIC', 'location', ['C'], null, true)
];
const REQ = [
  { segment: 'A', requirement_code: 'LICENCE', needed: true }, { segment: 'A', requirement_code: 'SERVICE', needed: true },
  { segment: 'B', requirement_code: 'LICENCE', needed: true }, { segment: 'B', requirement_code: 'SERVICE', needed: false },
  { segment: 'C', requirement_code: 'LICENCE', needed: false }, { segment: 'C', requirement_code: 'C_SERVICE', needed: true }
];
const codes = (k) => k.groups.flatMap(g => g.rows.map(r => r.doc_code));

describe('documentKit() (T013)', () => {
  test('R1: a needed requirement brings its document in; a not-needed one keeps it out; common by segments', async () => {
    const { documentKit } = await kit();
    assert.deepEqual(codes(documentKit({ segment: 'A', requirements: REQ, types: TYPES, locationDocs: [], hasShortlist: true, states: {} })), ['LAW_A', 'AGREEMENT', 'CREW']);
    assert.deepEqual(codes(documentKit({ segment: 'B', requirements: REQ, types: TYPES, locationDocs: [], hasShortlist: true, states: {} })), ['LAW_A', 'CREW'],
      'SERVICE is not needed for B (BR-004: the configuration decides)');
  });

  test('R1: a location document only when a shortlisted location needs it and the segment matches', async () => {
    const { documentKit } = await kit();
    const a = documentKit({ segment: 'A', requirements: REQ, types: TYPES, locationDocs: ['HERITAGE', 'C_PUBLIC'], hasShortlist: true, states: {} });
    assert.deepEqual(a.groups.find(g => g.basis === 'location').rows.map(r => r.doc_code), ['HERITAGE']);
    assert.equal(a.location_note, false);
  });

  test('BR-003: every row has a basis; groups in the order law → common → location', async () => {
    const { documentKit } = await kit();
    const k = documentKit({ segment: 'A', requirements: REQ, types: TYPES, locationDocs: ['HERITAGE'], hasShortlist: true, states: {} });
    assert.deepEqual(k.groups.map(g => g.basis), ['law', 'common', 'location']);
    for (const g of k.groups) for (const r of g.rows) assert.equal(r.basis, g.basis);
  });

  test('Q1: segment C items carry awaiting_confirmation; no row of another segment', async () => {
    const { documentKit } = await kit();
    const k = documentKit({ segment: 'C', requirements: REQ, types: TYPES, locationDocs: [], hasShortlist: false, states: {} });
    assert.deepEqual(codes(k), ['C_CONTRACT', 'C_SCHEDULE']);
    assert.ok(k.groups.flatMap(g => g.rows).every(r => r.awaiting_confirmation === true));
  });

  test('SC-26 Empty: no shortlisted location → no location group and location_note; states default to missing; progress', async () => {
    const { documentKit } = await kit();
    const k = documentKit({ segment: 'A', requirements: REQ, types: TYPES, locationDocs: [], hasShortlist: false, states: { LAW_A: 'present' } });
    assert.equal(k.location_note, true);
    assert.ok(!k.groups.some(g => g.basis === 'location'));
    const rows = k.groups.flatMap(g => g.rows);
    assert.equal(rows.find(r => r.doc_code === 'LAW_A').state, 'present');
    assert.equal(rows.find(r => r.doc_code === 'CREW').state, 'missing');
    assert.deepEqual(k.progress, { present: 1, total: 3 });
  });

  test('SC-26 #4: another segment (the chip) changes the rows and keeps the shortlist', async () => {
    const { documentKit } = await kit();
    const k = documentKit({ segment: 'C', requirements: REQ, types: TYPES, locationDocs: ['HERITAGE', 'C_PUBLIC'], hasShortlist: true, states: {} });
    assert.deepEqual(codes(k), ['C_CONTRACT', 'C_SCHEDULE', 'C_PUBLIC']);
  });

  test('BR-004: no document code, requirement code or segment literal in lib/documents/kit.js', () => {
    const src = fs.readFileSync('lib/documents/kit.js', 'utf8').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(src, /'[A-Z][A-Z0-9]+_[A-Z0-9_]+'|"[A-Z][A-Z0-9]+_[A-Z0-9_]+"/, 'no document or requirement code');
    assert.doesNotMatch(src, /['"][ABC]['"]/, 'no segment literal');
  });
});
