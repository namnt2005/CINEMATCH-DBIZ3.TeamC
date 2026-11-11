import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// Document kit on node:sqlite (T014 — first part, written 11/11/2026; M5 Clarifications Q1, BR-003, BR-004, decision D1).
// Segment C gets the minimum list of Q1, every item labelled "awaiting VFDA confirmation", and no Article 13 row.
// The expected list is computed from the seed files after D1 (document_type.requirement_code, awaiting_confirmation and
// segment_requirement), never typed here; the test first checks that those columns exist.
const SEED = new URL('../../data/seed/', import.meta.url);
function csv(table) {
  const file = readdirSync(SEED).find(f => f.endsWith(`_${table}.csv`));
  const text = readFileSync(new URL(file, SEED), 'utf8').trim();
  const out = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n') { row.push(cell); out.push(row); row = []; cell = ''; } else cell += ch;
  }
  row.push(cell); out.push(row);
  const [head, ...body] = out;
  return { head, rows: body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]]))) };
}
const types = csv('document_type');
const needed = new Set(csv('segment_requirement').rows.filter(r => r.segment === 'C' && r.needed === 'true').map(r => r.requirement_code));
const monsoon = csv('project').rows.find(p => p.project_name === 'Monsoon Signal');
const owner = csv('project_member').rows.find(m => m.project_id === monsoon.project_id && m.permission === 'owner');
const SESSION = { role: 'member', isAuthenticated: true, userId: owner.user_id };

describe('Q1: the segment C list carries "awaiting VFDA confirmation" (T014)', () => {
  test('D1 columns exist in the seed and segment C has at least three non-location items flagged', () => {
    assert.ok(types.head.includes('requirement_code'), 'document_type.requirement_code (D1)');
    assert.ok(types.head.includes('awaiting_confirmation'), 'document_type.awaiting_confirmation (D1)');
    const c = types.rows.filter(t => t.basis !== 'location' && JSON.parse(t.segments).includes('C'));
    assert.ok(c.length >= 3, 'crew passports and visas, service contract, shooting schedule (Q1)');
    assert.ok(c.every(t => t.awaiting_confirmation === 'true'));
  });

  test('Monsoon Signal (segment C, no shortlist): exactly the C items of the seed, each flagged, no Article 13 row', async () => {
    const { getKit } = await import('../../lib/db/documents.js');
    const kit = await getKit(SESSION, monsoon.project_id);
    const got = kit.groups.flatMap(g => g.rows);
    const expected = types.rows.filter(t => t.basis !== 'location' && JSON.parse(t.segments).includes('C')
      && (t.requirement_code ? needed.has(t.requirement_code) : true)).map(t => t.doc_code).sort();
    assert.deepEqual(got.map(r => r.doc_code).sort(), expected);
    assert.ok(got.length >= 3);
    for (const r of got) {
      assert.equal(r.awaiting_confirmation, true, `${r.doc_code}: awaiting VFDA confirmation`);
      assert.ok(['law', 'common', 'location'].includes(r.basis), `${r.doc_code}: basis label (BR-003)`);
      assert.doesNotMatch(r.doc_code, /^A13_/, 'no Article 13 row for segment C');
    }
    assert.equal(kit.location_note, true, 'no shortlisted location → location group replaced by the note');
  });
});

// ---- T014, rest (written 11/11/2026): US-1 Sc1–2, BR-004, SR-153, G1, uploads, downloads -------------------------
const { getDb, query } = await import('../../lib/db/client.js');
const projects = csv('project').rows;
const members = csv('project_member').rows;
const projectNamed = (n) => projects.find(p => p.project_name === n);
const ownerOf = (p) => ({ role: 'member', isAuthenticated: true, userId: members.find(m => m.project_id === p.project_id && m.permission === 'owner').user_id });
const FERRY = projectNamed('The Last Ferry');
const LENA = ownerOf(FERRY);
const DANIEL = { role: 'member', isAuthenticated: true, userId: members.find(m => m.permission === 'view' && m.user_id && m.invite_status === 'accepted' && m.project_id === projectNamed('Rice and Salt').project_id).user_id };
const rowsOf = (kit) => kit.groups.flatMap(g => g.rows.map(r => ({ ...r, group: g.basis })));
/** Runs fn inside a transaction that is always rolled back. */
async function rolledBack(fn) {
  const db = getDb();
  db.exec('BEGIN');
  try { return await fn(db); } finally { db.exec('ROLLBACK'); }
}

describe('Document kit on the seed (T014)', () => {
  test('US-1 Sc1: The Last Ferry → the four Article 13 documents Required by law, the foreign crew list Commonly requested', async () => {
    const { getKit } = await import('../../lib/db/documents.js');
    const rows = rowsOf(await getKit(LENA, FERRY.project_id));
    const law = rows.filter(r => r.group === 'law').map(r => r.doc_code).sort();
    assert.deepEqual(law, ['A13_APPLICATION', 'A13_ART9_COMMITMENT', 'A13_SCRIPT_VI', 'A13_SERVICE_AGREEMENT']);
    assert.equal(rows.find(r => r.doc_code === 'FOREIGN_CREW_LIST').group, 'common');
  });

  test('US-1 Sc2: Tràng An is shortlisted → the heritage consent is Location-specific; without the shortlist row it is gone', async () => {
    const { getKit } = await import('../../lib/db/documents.js');
    assert.equal(rowsOf(await getKit(LENA, FERRY.project_id)).find(r => r.doc_code === 'HERITAGE_SITE_PERMIT')?.group, 'location');
    await rolledBack(async (db) => {
      db.prepare("DELETE FROM project_shortlist WHERE project_id = ? AND location_id IN (SELECT location_id FROM location WHERE name_en = 'Tràng An Landscape Complex')").run(FERRY.project_id);
      assert.equal(rowsOf(await getKit(LENA, FERRY.project_id)).some(r => r.doc_code === 'HERITAGE_SITE_PERMIT'), false);
    });
  });

  test('BR-004: setting VN_SERVICE_AGREEMENT not needed for A removes the service agreement — no code change', async () => {
    const { getKit } = await import('../../lib/db/documents.js');
    await rolledBack(async (db) => {
      db.prepare("UPDATE segment_requirement SET needed = 'false' WHERE segment = 'A' AND requirement_code = 'VN_SERVICE_AGREEMENT'").run();
      assert.equal(rowsOf(await getKit(LENA, FERRY.project_id)).some(r => r.doc_code === 'A13_SERVICE_AGREEMENT'), false);
    });
    assert.equal(rowsOf(await getKit(LENA, FERRY.project_id)).some(r => r.doc_code === 'A13_SERVICE_AGREEMENT'), true);
  });

  test('Q1: with a public-place location shortlisted, Monsoon Signal also gets the local permit (location-specific, flagged)', async () => {
    const { getKit } = await import('../../lib/db/documents.js');
    await rolledBack(async (db) => {
      db.prepare("INSERT INTO project_shortlist (shortlist_id, project_id, location_id, role) SELECT 'aaaaaaaa-0000-4000-8000-000000000001', ?, location_id, 'primary' FROM location_document_type WHERE doc_code = 'LOCAL_PERMIT_PUBLIC_C'").run(monsoon.project_id);
      const row = rowsOf(await getKit(SESSION, monsoon.project_id)).find(r => r.doc_code === 'LOCAL_PERMIT_PUBLIC_C');
      assert.equal(row?.group, 'location');
      assert.equal(row.awaiting_confirmation, true);
    });
  });

  test('SR-153: the four Article 13 states equal getDossier() for every seed project the dossier applies to', async () => {
    const { getKit } = await import('../../lib/db/documents.js');
    const { getDossier } = await import('../../lib/db/dossier.js');
    for (const p of projects.filter(p => p.segment !== 'C')) {
      const s = ownerOf(p);
      const d = await getDossier(s, p.project_id);
      const kit = rowsOf(await getKit(s, p.project_id));
      for (const c of d.components) assert.equal(kit.find(r => r.doc_code === c.doc_code)?.state, c.state, `${p.project_name} ${c.doc_code}`);
    }
  });

  test('G1: the provincial notice copy is a common row of A / B kits with its state from M7, and absent for C', async () => {
    const { getKit } = await import('../../lib/db/documents.js');
    const interests = csv('location_interest').rows;
    const done = new Set(csv('province_notice').rows.filter(n => n.review_status === 'approved' && n.sent_at)
      .map(n => interests.find(i => i.interest_id === n.interest_id).project_id));
    for (const name of ['The Last Ferry', 'Above the Terraces', 'Rice and Salt', 'Quiet Harbour Blues', 'Lantern Street']) {
      const p = projectNamed(name);
      const row = rowsOf(await getKit(ownerOf(p), p.project_id)).find(r => r.doc_code === 'PROVINCIAL_NOTICE_COPY');
      assert.equal(row?.group, 'common', name);
      assert.equal(row.state, done.has(p.project_id) ? 'present' : 'missing', name);
    }
    assert.ok(done.has(FERRY.project_id) && !done.has(projectNamed('Lantern Street').project_id), 'seed boundary');
    assert.equal(rowsOf(await getKit(SESSION, monsoon.project_id)).some(r => r.doc_code === 'PROVINCIAL_NOTICE_COPY'), false);
  });
});

describe('Uploads and downloads on node:sqlite (T014, FR-002, SR-154)', () => {
  const store = () => import('../../lib/storage/project-documents.js');
  const docs = () => import('../../lib/db/documents.js');
  async function memory() { const s = await store(); const a = s.memoryAdapter(); s.setProjectDocumentsForTests(a); return { s, a }; }

  test('first upload → version 1 and the slot present; a replacement → version 2, version 1 kept (edge case)', async () => {
    const { s, a } = await memory();
    const { requestUpload, recordDocument, listVersions } = await docs();
    const up = await requestUpload(LENA, FERRY.project_id, { doc_code: 'A13_ART9_COMMITMENT', filename: 'undertaking.pdf', content_type: 'application/pdf', size: 12 });
    assert.ok(s.isPathOf(FERRY.project_id, 'A13_ART9_COMMITMENT', up.path));
    assert.equal(up.expires_in, 300);
    await a.write(up.path, Buffer.from('%PDF-1.7\n%x\n'));
    const v1 = await recordDocument(LENA, FERRY.project_id, { doc_code: 'A13_ART9_COMMITMENT', path: up.path });
    assert.equal(v1.version, 1);
    assert.equal(v1.state, 'present');
    const up2 = await requestUpload(LENA, FERRY.project_id, { doc_code: 'A13_ART9_COMMITMENT', filename: 'undertaking-v2.pdf', content_type: 'application/pdf', size: 12 });
    await a.write(up2.path, Buffer.from('%PDF-1.7\n%y\n'));
    assert.equal((await recordDocument(LENA, FERRY.project_id, { doc_code: 'A13_ART9_COMMITMENT', path: up2.path })).version, 2);
    assert.deepEqual((await listVersions(LENA, FERRY.project_id, 'A13_ART9_COMMITMENT')).map(v => v.version), [2, 1]);
    s.setProjectDocumentsForTests(null);
  });

  test('refusals: view member FORBIDDEN, archived project ARCHIVED, code outside the kit NOT_IN_KIT, the notice copy and another project\'s path VALIDATION_ERROR, nothing uploaded UPLOAD_MISSING', async () => {
    const { s, a } = await memory();
    const { requestUpload, recordDocument } = await docs();
    const pdf = { filename: 'x.pdf', content_type: 'application/pdf', size: 10 };
    const rice = projectNamed('Rice and Salt');
    const lights = projectNamed('Harbour Lights (cancelled)');
    await assert.rejects(requestUpload(DANIEL, rice.project_id, { doc_code: 'A13_APPLICATION', ...pdf }), (e) => e.code === 'FORBIDDEN');
    await assert.rejects(requestUpload(ownerOf(lights), lights.project_id, { doc_code: 'A13_APPLICATION', ...pdf }), (e) => e.code === 'ARCHIVED');
    await assert.rejects(requestUpload(LENA, FERRY.project_id, { doc_code: 'SERVICE_CONTRACT_C', ...pdf }), (e) => e.code === 'NOT_IN_KIT');
    await assert.rejects(requestUpload(LENA, FERRY.project_id, { doc_code: 'PROVINCIAL_NOTICE_COPY', ...pdf }), (e) => e.code === 'VALIDATION_ERROR');
    const other = s.uploadPathFor(rice.project_id, 'A13_APPLICATION', 'pdf');
    await a.write(other, Buffer.from('%PDF-1.7\n'));
    await assert.rejects(recordDocument(LENA, FERRY.project_id, { doc_code: 'A13_APPLICATION', path: other }), (e) => e.code === 'VALIDATION_ERROR');
    const never = s.uploadPathFor(FERRY.project_id, 'A13_APPLICATION', 'pdf');
    await assert.rejects(recordDocument(LENA, FERRY.project_id, { doc_code: 'A13_APPLICATION', path: never }), (e) => e.code === 'UPLOAD_MISSING');
    s.setProjectDocumentsForTests(null);
  });

  test('SR-154: a download writes one access-log row and answers a 60 s link; a non-member is refused', async () => {
    const { s, a } = await memory();
    const { documentForDownload } = await docs();
    const doc = query("SELECT document_id, file_path FROM document WHERE project_id = ? ORDER BY version DESC LIMIT 1", [FERRY.project_id])[0];
    await a.write(doc.file_path, Buffer.from('%PDF-1.7\n'));
    const before = query('SELECT COUNT(*) AS n FROM document_access_log WHERE document_id = ?', [doc.document_id])[0].n;
    const out = await documentForDownload(LENA, doc.document_id);
    assert.equal(out.expires_in, 60);
    assert.equal(query('SELECT COUNT(*) AS n FROM document_access_log WHERE document_id = ?', [doc.document_id])[0].n, before + 1);
    await assert.rejects(documentForDownload(DANIEL, doc.document_id), (e) => ['FORBIDDEN', 'NOT_FOUND'].includes(e.code));
    s.setProjectDocumentsForTests(null);
  });
});
