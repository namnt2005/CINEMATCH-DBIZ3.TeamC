import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// Proofreading and Article 13 component b on node:sqlite (T033 — first part, written 11/11/2026; M5 BR-002, US-2 Sc3).
// The Last Ferry has a 14-paragraph Vietnamese draft in the seed. Component b may become "present" only when every
// paragraph is proofread by a person: with one paragraph left it is not present on SC-27 (M2 getDossier) nor on SC-26
// (M5 getKit); the last proofread makes it present on both. Expected rows come from the seed files, found by table name.
const SEED = new URL('../../data/seed/', import.meta.url);
function rows(table) {
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
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const project = rows('project').find(p => p.project_name === 'The Last Ferry');
const owner = rows('project_member').find(m => m.project_id === project.project_id && m.permission === 'owner');
const LENA = { role: 'member', isAuthenticated: true, userId: owner.user_id };
const paragraphs = rows('bilingual_paragraph').filter(p => p.project_id === project.project_id && p.doc_code === 'A13_SCRIPT_VI');
const unreviewed = paragraphs.filter(p => p.status !== 'reviewed').map(p => Number(p.idx)).sort((a, b) => a - b);

const drafts = () => import('../../lib/db/drafts.js');
const stateB = async () => {
  const { getDossier } = await import('../../lib/db/dossier.js');
  return (await getDossier(LENA, project.project_id)).components.find(c => c.doc_code === 'A13_SCRIPT_VI').state;
};
const kitStateB = async () => {
  const { getKit } = await import('../../lib/db/documents.js');
  const kit = await getKit(LENA, project.project_id);
  return kit.groups.flatMap(g => g.rows).find(r => r.doc_code === 'A13_SCRIPT_VI').state;
};

describe('BR-002: component b is not present while a paragraph is not proofread (T033)', () => {
  test('seed boundary: 14 paragraphs, some not proofread', () => {
    assert.equal(paragraphs.length, 14);
    assert.ok(unreviewed.length >= 2, 'at least two paragraphs to proofread');
  });

  test('13 of 14 proofread → b NOT present on SC-27 and SC-26; the 14th → present on both', async () => {
    const { reviewParagraph } = await drafts();
    const [last, ...first] = [unreviewed.at(-1), ...unreviewed.slice(0, -1)];
    for (const idx of first) await reviewParagraph(LENA, project.project_id, 'A13_SCRIPT_VI', idx);
    assert.notEqual(await stateB(), 'present', 'SC-27 (M2 dossier check) with one paragraph left');
    assert.notEqual(await kitStateB(), 'present', 'SC-26 (M5 kit) with one paragraph left');
    await reviewParagraph(LENA, project.project_id, 'A13_SCRIPT_VI', last);
    assert.equal(await stateB(), 'present', 'SC-27 at 14 of 14');
    assert.equal(await kitStateB(), 'present', 'SC-26 at 14 of 14');
  });
});

// ---- T033, rest (written 11/11/2026): US-2 Sc1–2, empty paragraph, D4 with the NDA gate, BR-006 -----------------------
const { getDb, query } = await import('../../lib/db/client.js');
const users = rows('user_account');
const userNamed = (email) => users.find(u => u.email === email).user_id;
const ownerOf = (name) => { const p = rows('project').find(x => x.project_name === name); return { p, s: { role: 'member', isAuthenticated: true, userId: rows('project_member').find(m => m.project_id === p.project_id && m.permission === 'owner').user_id } }; };
const LAN = { role: 'partner', isAuthenticated: true, userId: userNamed('lan.pham@benxua.example.vn') };
const KHAI = { role: 'partner', isAuthenticated: true, userId: userNamed('khai.do@dongang.example.vn') };
const DANIEL = { role: 'member', isAuthenticated: true, userId: userNamed('daniel.okafor@kestrelpictures.example.co.uk') };
const MOCK = { env: { LLM_PROVIDER: 'mock', NODE_ENV: 'test' } };
const fourteen = (word) => Array.from({ length: 14 }, (_, i) => `Paragraph ${i + 1}: the ${word} farmers work in the delta at dawn.`).join('\n\n');
async function rolledBack(fn) { const db = getDb(); db.exec('BEGIN'); try { return await fn(db); } finally { db.exec('ROLLBACK'); } }
const paragraph = (projectId, idx) => query("SELECT * FROM bilingual_paragraph WHERE project_id = ? AND doc_code = 'A13_SCRIPT_VI' AND idx = ?", [projectId, idx])[0];
const slot = (projectId) => query("SELECT state FROM document_slot WHERE project_id = ? AND doc_code = 'A13_SCRIPT_VI'", [projectId])[0]?.state;

describe('Drafts on node:sqlite (T033)', () => {
  test('US-2 Sc2: editing a proofread paragraph sets it back to machine, clears the reviewer and lowers the slot', async () => {
    const { editParagraph } = await drafts();
    assert.equal(paragraph(project.project_id, 1).status, 'reviewed', 'after the BR-002 test above');
    assert.equal(slot(project.project_id), 'present');
    const out = await editParagraph(LENA, project.project_id, 'A13_SCRIPT_VI', 1, 'Lúc bình minh, người lái đò chèo qua sông.');
    assert.equal(out.status, 'machine');
    const p = paragraph(project.project_id, 1);
    assert.equal(p.status, 'machine');
    assert.equal(p.reviewed_by ?? null, null);
    assert.equal(p.reviewed_at ?? null, null);
    assert.equal(slot(project.project_id), 'needs_fix');
  });

  test('D4: the Bến Xưa user (accepted, both NDA rows) reads and proofreads, with the organisation; cannot confirm', async () => {
    const { getDraft, reviewParagraph, confirmDraft } = await drafts();
    const d = await getDraft(LAN, project.project_id, 'A13_SCRIPT_VI');
    assert.equal(d.total, 14);
    assert.equal(d.can_proofread, true);
    assert.equal(d.can_confirm, false);
    await reviewParagraph(LAN, project.project_id, 'A13_SCRIPT_VI', 1);
    assert.ok(paragraph(project.project_id, 1).reviewer_org_id, 'reviewer_org_id set for a partner');
    await assert.rejects(confirmDraft(LAN, project.project_id, 'A13_SCRIPT_VI'), (e) => e.code === 'FORBIDDEN');
  });

  test('D4: with the request confirmed (rolled back), the partner confirms the whole document; the slot becomes present', async () => {
    const { editParagraph, confirmDraft } = await drafts();
    await rolledBack(async (db) => {
      await editParagraph(LENA, project.project_id, 'A13_SCRIPT_VI', 2, 'Những người lính đợi ở bờ bên kia.');
      db.prepare("UPDATE collab_request SET status = 'confirmed', confirmed_at = '2026-11-11T09:00:00+07:00' WHERE project_id = ? AND status = 'accepted'").run(project.project_id);
      const out = await confirmDraft(LAN, project.project_id, 'A13_SCRIPT_VI');
      assert.equal(out.marked, 1);
      assert.equal(out.reviewed, 14);
      assert.equal(slot(project.project_id), 'present');
    });
  });

  test('NDA gate (I1): with the partner NDA row removed (rolled back), the same user reads nothing and cannot proofread', async () => {
    const { getDraft, reviewParagraph, editParagraph } = await drafts();
    await editParagraph(LENA, project.project_id, 'A13_SCRIPT_VI', 3, 'Sương tan trên những ngọn núi đá vôi.');
    await rolledBack(async (db) => {
      db.prepare("DELETE FROM nda_acceptance WHERE party = 'partner' AND request_id IN (SELECT request_id FROM collab_request WHERE project_id = ? AND status = 'accepted')").run(project.project_id);
      await assert.rejects(getDraft(LAN, project.project_id, 'A13_SCRIPT_VI'), (e) => e.code === 'NOT_FOUND');
      await assert.rejects(reviewParagraph(LAN, project.project_id, 'A13_SCRIPT_VI', 3), (e) => e.code === 'NOT_FOUND');
    });
  });

  test('D4: a view member cannot proofread; a partner with a withdrawn request reads nothing; an empty paragraph cannot be proofread', async () => {
    const { reviewParagraph, getDraft } = await drafts();
    const { p: rice, s: sophie } = ownerOf('Rice and Salt');
    await assert.rejects(reviewParagraph(DANIEL, rice.project_id, 'A13_SCRIPT_VI', 1), (e) => e.code === 'FORBIDDEN');
    await assert.rejects(getDraft(KHAI, project.project_id, 'A13_SCRIPT_VI'), (e) => e.code === 'NOT_FOUND');
    assert.equal(paragraph(rice.project_id, 1).target_text ?? '', '', 'seed: the failed translation of Rice and Salt');
    await assert.rejects(reviewParagraph(sophie, rice.project_id, 'A13_SCRIPT_VI', 1), (e) => e.code === 'EMPTY_PARAGRAPH');
  });

  test('US-2 Sc1: 14 English paragraphs → 14 machine paragraphs (mock); creating again replaces them', async () => {
    const { createDraft, getDraft } = await drafts();
    const { p: rice, s: sophie } = ownerOf('Rice and Salt');
    const out = await createDraft(sophie, rice.project_id, 'A13_SCRIPT_VI', { text: fourteen('salt'), consent: false }, MOCK);
    assert.equal(out.paragraphs, 14);
    assert.equal(out.method, 'mock');
    const d = await getDraft(sophie, rice.project_id, 'A13_SCRIPT_VI');
    assert.equal(d.total, 14);
    assert.ok(d.paragraphs.every(p => p.status === 'machine' && p.target_text.startsWith('[VI] ')));
    await createDraft(sophie, rice.project_id, 'A13_SCRIPT_VI', { text: 'One paragraph only.', consent: false }, MOCK);
    assert.equal((await getDraft(sophie, rice.project_id, 'A13_SCRIPT_VI')).total, 1);
  });

  test('BR-006: a term saved for Rice and Salt is used by its next draft and not by another project\'s draft', async () => {
    const { createDraft, getDraft } = await drafts();
    const { saveTerm } = await import('../../lib/db/glossary.js');
    const { p: rice, s: sophie } = ownerOf('Rice and Salt');
    const { p: terraces, s: liam } = ownerOf('Above the Terraces');
    await saveTerm(sophie, rice.project_id, { term_en: 'salt', term_vi: 'muối' });
    await createDraft(sophie, rice.project_id, 'A13_SCRIPT_VI', { text: fourteen('salt'), consent: false }, MOCK);
    assert.ok((await getDraft(sophie, rice.project_id, 'A13_SCRIPT_VI')).paragraphs.every(p => p.target_text.includes('muối')));
    await createDraft(liam, terraces.project_id, 'A13_SCRIPT_VI', { text: fourteen('salt'), consent: false }, MOCK);
    assert.ok((await getDraft(liam, terraces.project_id, 'A13_SCRIPT_VI')).paragraphs.every(p => !p.target_text.includes('muối')));
  });
});
