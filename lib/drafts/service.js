// Bilingual drafts and the project glossary (M5 FR-004..FR-006, BR-001, BR-002, BR-006, Q3; specs/009-m5-dossier D2–D4,
// R4–R10). One implementation for both data sources: each source supplies `ops` that read rows and write through its
// function (node:sqlite twin or Supabase RPC, which check the rights again).
import { CheckError } from '../checks/errors.js';
import { splitParagraphs, checkParagraphs } from './paragraphs.js';
import { textFromDocx } from './docx.js';
import { translateParagraphs, translationMode } from './translate.js';
import { glossaryMismatches, validateTerm } from './glossary.js';
import { draftRights } from './rights.js';
import { renderBilingualPdf } from '../pdf/bilingual-pdf.js';
import { projectStore, draftPdfPathFor, DOWNLOAD_SECONDS } from '../storage/project-documents.js';

const CODE = /^[A-Z0-9_]{1,40}$/;
const signedIn = (session) => Boolean(session?.isAuthenticated && session.userId);

export function makeDrafts(ops) {
  async function rights(session, projectId) {
    if (!signedIn(session)) throw new CheckError('UNAUTHENTICATED');
    const ctx = await ops.context(session, projectId);
    const r = ctx ? draftRights({ permission: ctx.permission, stage: ctx.project.stage, partner: ctx.partner }) : null;
    if (!r?.can_read) throw new CheckError('NOT_FOUND');
    return { ...ctx, rights: r };
  }
  const code = (docCode) => { if (!CODE.test(String(docCode || ''))) throw new CheckError('NOT_FOUND'); return docCode; };
  const need = (ok, err = 'FORBIDDEN') => { if (!ok) throw new CheckError(err); };
  const noArchive = (ctx) => need(ctx.project.stage !== 'archived', 'ARCHIVED');

  async function writeTranslations(session, projectId, docCode, out) {
    for (const t of out.translations) if (t.target_text) await ops.edit(session, projectId, docCode, t.idx, t.target_text);
  }

  return {
    async listDrafts(session, projectId) {
      await rights(session, projectId);
      const drafts = await ops.listDraftRows(projectId);
      return { drafts: drafts.sort((a, b) => (a.doc_code === 'A13_SCRIPT_VI' ? -1 : b.doc_code === 'A13_SCRIPT_VI' ? 1 : a.doc_code < b.doc_code ? -1 : 1)) };
    },

    async getDraft(session, projectId, docCode, { env = process.env } = {}) {
      const ctx = await rights(session, projectId);
      code(docCode);
      const { doc, paragraphs, names, orgNames } = await ops.loadDraft(projectId, docCode);
      const glossary = await ops.terms(projectId);
      const base = { doc_code: docCode, can_edit: ctx.rights.can_edit, can_proofread: ctx.rights.can_proofread, can_confirm: ctx.rights.can_confirm,
        translation: translationMode(env), glossary };
      if (!doc) return { exists: false, ...base, paragraphs: [], reviewed: 0, total: 0, mismatches: [], pdf_ready: false };
      const rows = paragraphs.sort((a, b) => a.idx - b.idx).map(p => ({ idx: Number(p.idx), source_text: p.source_text, target_text: p.target_text ?? '', status: p.status,
        reviewed_by_name: p.reviewed_by ? names[p.reviewed_by] ?? null : null, reviewer_org_name: p.reviewer_org_id ? orgNames[p.reviewer_org_id] ?? null : null,
        reviewed_at: p.reviewed_at ?? null }));
      return { exists: true, ...base, structure_version: doc.structure_version, paragraphs: rows, reviewed: rows.filter(p => p.status === 'reviewed').length,
        total: rows.length, mismatches: glossaryMismatches(rows, glossary), pdf_ready: Boolean(doc.pdf_url) };
    },

    /** { text } or { docx: Buffer }, consent → draft, then the translation Q3 allows. */
    async createDraft(session, projectId, docCode, { text, docx, consent = false } = {}, { env = process.env, client, timeoutMs } = {}) {
      const ctx = await rights(session, projectId);
      code(docCode);
      need(ctx.rights.can_edit || ctx.project.stage === 'archived'); noArchive(ctx);
      if (!(await ops.kitCodes(session, projectId)).has(docCode)) throw new CheckError('NOT_IN_KIT', { doc_code: 'documents.error.not_in_kit' });
      const source = docx ? await textFromDocx(docx) : String(text ?? '');
      const paragraphs = splitParagraphs(source);
      const bad = checkParagraphs(paragraphs);
      if (bad) throw new CheckError('VALIDATION_ERROR', { text: bad });
      await ops.create(session, projectId, docCode, paragraphs.join('\n\n'), paragraphs);
      const out = await translateParagraphs({ paragraphs: paragraphs.map((p, i) => ({ idx: i + 1, source_text: p })), glossary: await ops.terms(projectId), consent },
        { env, client, timeoutMs });
      await writeTranslations(session, projectId, docCode, out);
      return { paragraphs: paragraphs.length, translated: out.translations.filter(t => t.target_text).length, failed: out.failed, method: out.method };
    },

    /** Retry one paragraph (idx) or every empty one, when the paid plan and the tick (or mock mode) allow it. */
    async translateDraft(session, projectId, docCode, { idx = null, consent = false } = {}, { env = process.env, client, timeoutMs } = {}) {
      const ctx = await rights(session, projectId);
      code(docCode);
      need(ctx.rights.can_edit || ctx.project.stage === 'archived'); noArchive(ctx);
      const mode = translationMode(env);
      if (!mode.available || (mode.consent_needed && consent !== true)) throw new CheckError('TRANSLATION_UNAVAILABLE');
      const { doc, paragraphs } = await ops.loadDraft(projectId, docCode);
      if (!doc) throw new CheckError('NOT_FOUND');
      const todo = paragraphs.filter(p => (idx == null ? !String(p.target_text || '').trim() : Number(p.idx) === Number(idx)))
        .map(p => ({ idx: Number(p.idx), source_text: p.source_text }));
      const out = await translateParagraphs({ paragraphs: todo, glossary: await ops.terms(projectId), consent }, { env, client, timeoutMs });
      await writeTranslations(session, projectId, docCode, out);
      return { translated: out.translations.filter(t => t.target_text).length, failed: out.failed };
    },

    async editParagraph(session, projectId, docCode, idx, text) {
      const ctx = await rights(session, projectId);
      code(docCode);
      need(ctx.rights.can_proofread || ctx.project.stage === 'archived'); noArchive(ctx);
      if (typeof text !== 'string' || text.length > 8000) throw new CheckError('VALIDATION_ERROR', { target_text: 'drafts.error.target' });
      return ops.edit(session, projectId, docCode, Number(idx), text);
    },

    async reviewParagraph(session, projectId, docCode, idx) {
      const ctx = await rights(session, projectId);
      code(docCode);
      need(ctx.rights.can_proofread || ctx.project.stage === 'archived'); noArchive(ctx);
      return ops.review(session, projectId, docCode, Number(idx), ctx);
    },

    async confirmDraft(session, projectId, docCode) {
      const ctx = await rights(session, projectId);
      code(docCode);
      need(ctx.rights.can_confirm || ctx.project.stage === 'archived'); noArchive(ctx);
      return ops.confirm(session, projectId, docCode, ctx);
    },

    /** BR-001: renders the two-column PDF (watermark on every page), stores it and answers a 60 s link. */
    async exportPdf(session, projectId, docCode) {
      const ctx = await rights(session, projectId);
      code(docCode);
      need(ctx.rights.can_edit || ctx.project.stage === 'archived'); noArchive(ctx);
      const { doc, paragraphs } = await ops.loadDraft(projectId, docCode);
      if (!doc) throw new CheckError('NOT_FOUND');
      const p = ctx.project;
      const buffer = await renderBilingualPdf({ title: p.project_name, meta: { segment: p.segment, format: p.format, shoot_date: p.shoot_date },
        paragraphs: paragraphs.sort((a, b) => a.idx - b.idx).map(x => ({ idx: Number(x.idx), source_text: x.source_text, target_text: x.target_text ?? '', status: x.status })) });
      const path = draftPdfPathFor(projectId, docCode);
      const store = await projectStore();
      await store.write(path, buffer, 'application/pdf');
      await ops.setPdf(session, projectId, docCode, path);
      const signed = await store.signedDownload(path, DOWNLOAD_SECONDS);
      const pages = (buffer.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
      return { url: signed?.url ?? null, expires_in: DOWNLOAD_SECONDS, pages };
    },

    async listTerms(session, projectId) {
      await rights(session, projectId);
      return { terms: await ops.terms(projectId) };
    },

    async saveTerm(session, projectId, body = {}) {
      const ctx = await rights(session, projectId);
      need(ctx.rights.can_edit || ctx.project.stage === 'archived'); noArchive(ctx);
      const checked = validateTerm(body, await ops.terms(projectId));
      if (!checked.ok) throw new CheckError(checked.error === 'glossary.error.limit' ? 'LIMIT' : 'VALIDATION_ERROR', { term: checked.error });
      return ops.saveTerm(session, projectId, checked.value);
    },

    async deleteTerm(session, projectId, termEn) {
      const ctx = await rights(session, projectId);
      need(ctx.rights.can_edit || ctx.project.stage === 'archived'); noArchive(ctx);
      return ops.deleteTerm(session, projectId, String(termEn || ''));
    }
  };
}
