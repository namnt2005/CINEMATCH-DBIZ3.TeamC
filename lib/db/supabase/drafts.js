import { userDb, systemDb, rows } from './util.js';
import { rpcResult } from '../../checks/errors.js';
import { makeDrafts } from '../../drafts/service.js';
import { partnerAccess } from '../../drafts/rights.js';
import { kitCodes } from '../../documents/kit.js';
import { getKit } from './documents.js';

// Supabase source of SC-28: the rights are computed from rows the System actor reads (project_member, and for a partner
// the request with both NDA rows — M4's gate, D4), then every write goes through the M5 functions as the user, which
// check the same rights again (app.can_read_draft, app.can_proofread, app.can_confirm_draft).
const all = async (q) => rows(await q) || [];
const call = async (name, args) => rpcResult(await (await userDb()).rpc(name, args));

const ops = {
  async context(session, projectId) {
    const system = await systemDb();
    const project = rows(await system.from('project').select('project_id, project_name, segment, stage, format, shoot_date').eq('project_id', projectId).maybeSingle());
    if (!project) return null;
    const member = rows(await system.from('project_member').select('permission, invite_status').eq('project_id', projectId).eq('user_id', session.userId).maybeSingle());
    const [orgs, requests] = await Promise.all([
      all(system.from('organisation_user').select('org_id').eq('user_id', session.userId)),
      all(system.from('collab_request').select('request_id, org_id, status').eq('project_id', projectId))
    ]);
    const ndaRows = requests.length ? await all(system.from('nda_acceptance').select('request_id, party, accepted').in('request_id', requests.map(r => r.request_id))) : [];
    const permission = member && (!member.invite_status || member.invite_status === 'accepted') ? member.permission : null;
    return { project, permission, partner: partnerAccess({ userOrgIds: orgs.map(o => o.org_id), requests, ndaRows }) };
  },
  async kitCodes(session, projectId) { return kitCodes(await getKit(session, projectId)); },
  async loadDraft(projectId, docCode) {
    const system = await systemDb();
    const doc = rows(await system.from('bilingual_document').select('*').eq('project_id', projectId).eq('doc_code', docCode).maybeSingle());
    const paragraphs = doc ? await all(system.from('bilingual_paragraph').select('*').eq('project_id', projectId).eq('doc_code', docCode)) : [];
    const users = [...new Set(paragraphs.map(p => p.reviewed_by).filter(Boolean))];
    const orgIds = [...new Set(paragraphs.map(p => p.reviewer_org_id).filter(Boolean))];
    const profiles = users.length ? await all(system.from('profile').select('user_id, full_name').in('user_id', users)) : [];
    const orgs = orgIds.length ? await all(system.from('organisation').select('org_id, org_name').in('org_id', orgIds)) : [];
    return { doc, paragraphs, names: Object.fromEntries(profiles.map(p => [p.user_id, p.full_name])), orgNames: Object.fromEntries(orgs.map(o => [o.org_id, o.org_name])) };
  },
  async listDraftRows(projectId) {
    const system = await systemDb();
    const [docs, paragraphs, types] = await Promise.all([
      all(system.from('bilingual_document').select('doc_code, pdf_url').eq('project_id', projectId)),
      all(system.from('bilingual_paragraph').select('doc_code, status').eq('project_id', projectId)),
      all(system.from('document_type').select('doc_code, name_vi, name_en'))
    ]);
    return docs.map(d => {
      const t = types.find(x => x.doc_code === d.doc_code) || {};
      const ps = paragraphs.filter(p => p.doc_code === d.doc_code);
      return { doc_code: d.doc_code, name_vi: t.name_vi, name_en: t.name_en, paragraphs: ps.length, reviewed: ps.filter(p => p.status === 'reviewed').length, pdf: Boolean(d.pdf_url) };
    });
  },
  async terms(projectId) {
    const list = await all((await systemDb()).from('project_glossary').select('term_en, term_vi').eq('project_id', projectId));
    return list.map(t => ({ term_en: t.term_en, term_vi: t.term_vi })).sort((a, b) => (a.term_en < b.term_en ? -1 : 1));
  },
  create: (session, projectId, docCode, synopsis, paragraphs) => call('app_create_bilingual', { p_project_id: projectId, p_doc_code: docCode, p_synopsis_en: synopsis, p_paragraphs: paragraphs }),
  edit: (session, projectId, docCode, idx, text) => call('app_edit_paragraph', { p_project_id: projectId, p_doc_code: docCode, p_idx: idx, p_text: text }),
  review: (session, projectId, docCode, idx) => call('app_review_paragraph', { p_project_id: projectId, p_doc_code: docCode, p_idx: idx }),
  confirm: (session, projectId, docCode) => call('app_confirm_bilingual', { p_project_id: projectId, p_doc_code: docCode }),
  setPdf: (session, projectId, docCode, path) => call('app_set_bilingual_pdf', { p_project_id: projectId, p_doc_code: docCode, p_path: path }),
  saveTerm: (session, projectId, term) => call('app_save_glossary_term', { p_project_id: projectId, p_term_en: term.term_en, p_term_vi: term.term_vi }),
  deleteTerm: (session, projectId, termEn) => call('app_delete_glossary_term', { p_project_id: projectId, p_term_en: termEn })
};

export const { listDrafts, getDraft, createDraft, translateDraft, editParagraph, reviewParagraph, confirmDraft, exportPdf, listTerms, saveTerm, deleteTerm } = makeDrafts(ops);
