import { query, getOne, withTransaction } from '../client.js';
import { nowInVietnam } from '../audit.js';
import { CheckError } from '../../checks/errors.js';
import { makeDrafts } from '../../drafts/service.js';
import { partnerAccess } from '../../drafts/rights.js';
import { kitCodes } from '../../documents/kit.js';
import { userOf, permissionOf } from './partner-access.js';
import { getKit } from './documents.js';

// node:sqlite twins of app_create_bilingual, app_edit_paragraph, app_review_paragraph, app_confirm_bilingual,
// app_set_bilingual_pdf, app_save_glossary_term, app_delete_glossary_term (20261111000100_m5_dossier.sql).

const slotPresent = (db, projectId, docCode) => {
  const left = db.prepare("SELECT COUNT(*) AS n FROM bilingual_paragraph WHERE project_id = ? AND doc_code = ? AND status <> 'reviewed'").get(projectId, docCode).n;
  if (Number(left) === 0) {
    db.prepare(`INSERT INTO document_slot (project_id, doc_code, state) VALUES (?, ?, 'present')
      ON CONFLICT (project_id, doc_code) DO UPDATE SET state = 'present'`).run(projectId, docCode);
  }
};
const counts = (projectId, docCode) => getOne(`SELECT SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) AS reviewed, COUNT(*) AS total
  FROM bilingual_paragraph WHERE project_id = ? AND doc_code = ?`, [projectId, docCode]);
const slotState = (projectId, docCode) => getOne('SELECT state FROM document_slot WHERE project_id = ? AND doc_code = ?', [projectId, docCode])?.state ?? 'missing';

const ops = {
  context(session, projectId) {
    const project = getOne('SELECT project_id, project_name, segment, stage, format, shoot_date FROM project WHERE project_id = ?', [projectId]);
    if (!project || !userOf(session)) return null;
    const partner = partnerAccess({
      userOrgIds: query('SELECT org_id FROM organisation_user WHERE user_id = ?', [session.userId]).map(r => r.org_id),
      requests: query('SELECT request_id, org_id, status FROM collab_request WHERE project_id = ?', [projectId]),
      ndaRows: query('SELECT n.request_id, n.party, n.accepted FROM nda_acceptance n JOIN collab_request r ON r.request_id = n.request_id WHERE r.project_id = ?', [projectId])
    });
    return { project, permission: permissionOf(session, projectId), partner };
  },
  async kitCodes(session, projectId) { return kitCodes(await getKit(session, projectId)); },
  loadDraft(projectId, docCode) {
    const doc = getOne('SELECT * FROM bilingual_document WHERE project_id = ? AND doc_code = ?', [projectId, docCode]);
    const paragraphs = query('SELECT * FROM bilingual_paragraph WHERE project_id = ? AND doc_code = ?', [projectId, docCode]);
    const names = Object.fromEntries(query('SELECT user_id, full_name FROM profile').map(r => [r.user_id, r.full_name]));
    const orgNames = Object.fromEntries(query('SELECT org_id, org_name FROM organisation').map(r => [r.org_id, r.org_name]));
    return { doc, paragraphs, names, orgNames };
  },
  listDraftRows(projectId) {
    return query(`SELECT d.doc_code, t.name_vi, t.name_en, d.pdf_url,
        (SELECT COUNT(*) FROM bilingual_paragraph p WHERE p.project_id = d.project_id AND p.doc_code = d.doc_code) AS paragraphs,
        (SELECT COUNT(*) FROM bilingual_paragraph p WHERE p.project_id = d.project_id AND p.doc_code = d.doc_code AND p.status = 'reviewed') AS reviewed
      FROM bilingual_document d JOIN document_type t ON t.doc_code = d.doc_code WHERE d.project_id = ?`, [projectId])
      .map(r => ({ doc_code: r.doc_code, name_vi: r.name_vi, name_en: r.name_en, paragraphs: Number(r.paragraphs), reviewed: Number(r.reviewed), pdf: Boolean(r.pdf_url) }));
  },
  terms(projectId) { return query('SELECT term_en, term_vi FROM project_glossary WHERE project_id = ? ORDER BY term_en', [projectId]); },
  create(session, projectId, docCode, synopsis, paragraphs) {
    const p = getOne('SELECT project_name, segment, format, shoot_date FROM project WHERE project_id = ?', [projectId]);
    const meta = JSON.stringify({ title: p.project_name, segment: p.segment, format: p.format, shoot_date: p.shoot_date || null });
    const version = docCode === 'A13_SCRIPT_VI' ? 'art13-script-v1' : `${docCode.toLowerCase().replace(/_/g, '-')}-v1`;
    withTransaction((db) => {
      db.prepare(`INSERT INTO bilingual_document (project_id, doc_code, structure_version, synopsis_en, project_meta, pdf_url) VALUES (?, ?, ?, ?, ?, NULL)
        ON CONFLICT (project_id, doc_code) DO UPDATE SET synopsis_en = excluded.synopsis_en, project_meta = excluded.project_meta,
        structure_version = excluded.structure_version, pdf_url = NULL`).run(projectId, docCode, version, synopsis, meta);
      db.prepare('DELETE FROM bilingual_paragraph WHERE project_id = ? AND doc_code = ?').run(projectId, docCode);
      const ins = db.prepare("INSERT INTO bilingual_paragraph (project_id, doc_code, idx, source_text, target_text, status) VALUES (?, ?, ?, ?, '', 'machine')");
      paragraphs.forEach((text, i) => ins.run(projectId, docCode, i + 1, text));
      db.prepare("UPDATE document_slot SET state = 'needs_fix' WHERE project_id = ? AND doc_code = ? AND state = 'present'").run(projectId, docCode);
    });
    return paragraphs.length;
  },
  edit(session, projectId, docCode, idx, text) {
    const p = getOne('SELECT status FROM bilingual_paragraph WHERE project_id = ? AND doc_code = ? AND idx = ?', [projectId, docCode, idx]);
    if (!p) throw new CheckError('NOT_FOUND');
    withTransaction((db) => {
      db.prepare(`UPDATE bilingual_paragraph SET target_text = ?, status = 'machine', reviewed_by = NULL, reviewer_org_id = NULL, reviewed_at = NULL
        WHERE project_id = ? AND doc_code = ? AND idx = ?`).run(text.trim(), projectId, docCode, idx);
      if (p.status === 'reviewed') db.prepare("UPDATE document_slot SET state = 'needs_fix' WHERE project_id = ? AND doc_code = ? AND state = 'present'").run(projectId, docCode);
    });
    return { idx, status: 'machine', slot_state: slotState(projectId, docCode) };
  },
  review(session, projectId, docCode, idx, ctx) {
    const p = getOne('SELECT target_text FROM bilingual_paragraph WHERE project_id = ? AND doc_code = ? AND idx = ?', [projectId, docCode, idx]);
    if (!p) throw new CheckError('NOT_FOUND');
    if (!String(p.target_text ?? '').trim()) throw new CheckError('EMPTY_PARAGRAPH');
    const org = ctx.rights.reviewer_org_id;
    withTransaction((db) => {
      db.prepare(`UPDATE bilingual_paragraph SET status = 'reviewed', reviewed_by = ?, reviewer_org_id = ?, reviewed_at = ?
        WHERE project_id = ? AND doc_code = ? AND idx = ? AND status <> 'reviewed'`).run(session.userId, org, nowInVietnam(), projectId, docCode, idx);
      slotPresent(db, projectId, docCode);
    });
    const c = counts(projectId, docCode);
    return { idx, status: 'reviewed', reviewed: Number(c.reviewed), total: Number(c.total), slot_state: slotState(projectId, docCode) };
  },
  confirm(session, projectId, docCode, ctx) {
    if (!getOne('SELECT 1 AS ok FROM bilingual_document WHERE project_id = ? AND doc_code = ?', [projectId, docCode])) throw new CheckError('NOT_FOUND');
    if (getOne("SELECT 1 AS ok FROM bilingual_paragraph WHERE project_id = ? AND doc_code = ? AND TRIM(COALESCE(target_text, '')) = '' LIMIT 1", [projectId, docCode])) {
      throw new CheckError('EMPTY_PARAGRAPH');
    }
    let marked = 0;
    withTransaction((db) => {
      marked = Number(db.prepare(`UPDATE bilingual_paragraph SET status = 'reviewed', reviewed_by = ?, reviewer_org_id = ?, reviewed_at = ?
        WHERE project_id = ? AND doc_code = ? AND status <> 'reviewed'`).run(session.userId, ctx.rights.reviewer_org_id, nowInVietnam(), projectId, docCode).changes);
      slotPresent(db, projectId, docCode);
    });
    const c = counts(projectId, docCode);
    return { marked, reviewed: Number(c.reviewed), total: Number(c.total), slot_state: 'present' };
  },
  setPdf(session, projectId, docCode, path) {
    query('UPDATE bilingual_document SET pdf_url = ? WHERE project_id = ? AND doc_code = ?', [path, projectId, docCode]);
    return true;
  },
  saveTerm(session, projectId, term) {
    withTransaction((db) => {
      db.prepare('DELETE FROM project_glossary WHERE project_id = ? AND LOWER(term_en) = LOWER(?)').run(projectId, term.term_en);
      db.prepare('INSERT INTO project_glossary (project_id, term_en, term_vi) VALUES (?, ?, ?)').run(projectId, term.term_en, term.term_vi);
    });
    return term;
  },
  deleteTerm(session, projectId, termEn) {
    const res = getOne('SELECT COUNT(*) AS n FROM project_glossary WHERE project_id = ? AND LOWER(term_en) = LOWER(?)', [projectId, termEn.trim()]);
    if (!Number(res.n)) throw new CheckError('NOT_FOUND');
    query('DELETE FROM project_glossary WHERE project_id = ? AND LOWER(term_en) = LOWER(?)', [projectId, termEn.trim()]);
    return true;
  }
};

export const { listDrafts, getDraft, createDraft, translateDraft, editParagraph, reviewParagraph, confirmDraft, exportPdf, listTerms, saveTerm, deleteTerm } = makeDrafts(ops);
