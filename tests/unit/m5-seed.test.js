import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseCsv } from '../../lib/db/client.js';

// The M5 seed and schema after D1 (T004): the kit configuration — document_type.requirement_code and
// awaiting_confirmation, and the table location_document_type — so the kit is computed from segment_requirement and the
// shortlisted locations, never hard-coded (BR-004), each item with its basis (BR-003) and the Q1 label for segment C.
function seed(table) {
  const file = fs.readdirSync('data/seed').find(f => new RegExp(`^\\d+_${table}\\.csv$`).test(f));
  assert.ok(file, `seed file of ${table}`);
  const [head, ...rows] = parseCsv(fs.readFileSync(path.join('data/seed', file), 'utf8'));
  return { head, rows: rows.filter(r => r.length > 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]]))) };
}
const schema = fs.readFileSync('data/schema/schema-M5.sql', 'utf8');
const tableSql = (t) => (schema.match(new RegExp(`CREATE TABLE ${t} \\(([\\s\\S]*?)\\n\\);`)) || [])[1] || '';

describe('M5 seed and schema after D1 (T004)', () => {
  test('schema: document_type.requirement_code (nullable), awaiting_confirmation (NOT NULL) and the location CHECK', () => {
    const dt = tableSql('document_type');
    assert.match(dt, /\brequirement_code VARCHAR\(40\)(,|\n)/, 'requirement_code VARCHAR(40), nullable');
    assert.match(dt, /\bawaiting_confirmation BOOLEAN NOT NULL/);
    assert.match(dt, /CONSTRAINT ck_document_type_location_no_requirement CHECK/);
  });

  test('schema: location_document_type (location_id, doc_code) with its key and both foreign keys', () => {
    const t = tableSql('location_document_type');
    assert.ok(t, 'CREATE TABLE location_document_type');
    assert.match(t, /PRIMARY KEY \(location_id, doc_code\)/);
    assert.match(t, /FOREIGN KEY \(location_id\) REFERENCES location \(location_id\)/);
    assert.match(t, /FOREIGN KEY \(doc_code\) REFERENCES document_type \(doc_code\)/);
  });

  test('seed: the requirement codes of D1 and the new segment C types (Q1)', () => {
    const types = seed('document_type');
    assert.ok(types.head.includes('requirement_code') && types.head.includes('awaiting_confirmation'), 'D1 columns in the seed file');
    const by = Object.fromEntries(types.rows.map(t => [t.doc_code, t]));
    for (const c of ['A13_APPLICATION', 'A13_SCRIPT_VI', 'A13_ART9_COMMITMENT']) assert.equal(by[c].requirement_code, 'ART13_LICENCE', c);
    assert.equal(by.A13_SERVICE_AGREEMENT.requirement_code, 'VN_SERVICE_AGREEMENT');
    assert.equal(by.SERVICE_CONTRACT_C.requirement_code, 'SERVICE_CONTRACT');
    assert.equal(by.CREW_PASSPORT_VISA_C?.requirement_code, 'CREW_VISA');
    assert.equal(by.SHOOTING_SCHEDULE_C?.requirement_code ?? 'missing', '');
    assert.equal(by.LOCAL_PERMIT_PUBLIC_C?.basis, 'location');
    for (const t of types.rows) {
      const c = JSON.parse(t.segments).includes('C');
      assert.equal(t.awaiting_confirmation, c ? 'true' : 'false', `${t.doc_code}: awaiting_confirmation ⇔ segment C (Q1)`);
      if (t.basis === 'location') assert.equal(t.requirement_code, '', `${t.doc_code}: a location document has no requirement code`);
    }
  });

  test('seed: a type with a requirement code is listed for exactly the segments where that requirement is needed (R1)', () => {
    const needed = seed('segment_requirement').rows.filter(r => r.needed === 'true');
    const types = seed('document_type');
    assert.ok(types.head.includes('requirement_code'), 'the column exists, so the loop below is not empty by accident');
    const linked = types.rows.filter(r => r.requirement_code);
    assert.ok(linked.length >= 6, `${linked.length} linked types`);
    for (const t of linked) {
      const segs = needed.filter(r => r.requirement_code === t.requirement_code).map(r => r.segment).sort();
      assert.deepEqual(JSON.parse(t.segments).slice().sort(), segs, t.doc_code);
    }
  });

  test('seed: every location_document_type row points at a location-specific type; Tràng An → HERITAGE_SITE_PERMIT', () => {
    const basis = Object.fromEntries(seed('document_type').rows.map(t => [t.doc_code, t.basis]));
    const links = seed('location_document_type').rows;
    assert.ok(links.length >= 1);
    for (const l of links) assert.equal(basis[l.doc_code], 'location', l.doc_code);
    const trangAn = seed('location').rows.find(l => l.name_en === 'Tràng An Landscape Complex');
    assert.ok(links.some(l => l.location_id === trangAn.location_id && l.doc_code === 'HERITAGE_SITE_PERMIT'));
  });
});
