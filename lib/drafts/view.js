// SC-28 view rules (M5 BR-002, Q3, SC-28 #4, #7, #8, #10; analysis A1). No node: import: the editor uses it.
const ddmmyyyy = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
const empty = (p) => !String(p?.target_text ?? '').trim();

export function progressView(paragraphs = []) {
  const reviewed = paragraphs.filter(p => p.status === 'reviewed').length;
  const total = paragraphs.length;
  return { reviewed, total, pct: total ? Math.round((reviewed / total) * 100) : 0, complete: total > 0 && reviewed === total };
}

/** #10: the DRAFT strip with the number still to proofread, or the green strip at 100 % (component b updated). */
export function stripView(paragraphs = []) {
  const { reviewed, total, complete } = progressView(paragraphs);
  return complete ? { key: 'drafts.strip.done', vars: {}, ok: true } : { key: 'drafts.strip.draft', vars: { n: total - reviewed }, ok: false };
}

/** #7: always a text — not translated yet (A1), machine translation not proofread, or who proofread it and when. */
export function statusView(p) {
  if (p.status === 'reviewed') {
    const name = p.reviewer_org_name ? `${p.reviewed_by_name} (${p.reviewer_org_name})` : p.reviewed_by_name;
    return { key: 'drafts.status.reviewed', vars: { name: name || '—', date: ddmmyyyy(p.reviewed_at) } };
  }
  return { key: empty(p) ? 'drafts.status.empty' : 'drafts.status.machine', vars: {} };
}

/** #8: on non-empty paragraphs not yet proofread, for someone who may proofread. */
export const canMarkProofread = (p, rights) => Boolean(rights?.can_proofread) && p.status !== 'reviewed' && !empty(p);
/** Confirm whole document (D4): the confirmed partner, while something is left to confirm. */
export const showConfirm = (rights, paragraphs = []) => Boolean(rights?.can_confirm) && paragraphs.some(p => p.status !== 'reviewed');
/** Q3: the consent box only when the paid plan is configured. */
export const consentVisible = (translation) => Boolean(translation?.consent_needed);
export const mismatchVars = (term) => ({ en: term.term_en, vi: term.term_vi });

export const DRAFTS_KEYS = Object.freeze([
  'drafts.meta.title', 'drafts.title', 'drafts.picker', 'drafts.picker.new', 'drafts.progress', 'drafts.col.source', 'drafts.col.target',
  'drafts.status.empty', 'drafts.status.machine', 'drafts.status.reviewed', 'drafts.proofread', 'drafts.confirm', 'drafts.confirm.ask',
  'drafts.confirm.done', 'drafts.strip.draft', 'drafts.strip.done', 'drafts.strip.link', 'drafts.empty.title', 'drafts.empty.paste',
  'drafts.empty.docx', 'drafts.consent', 'drafts.create', 'drafts.recreate', 'drafts.recreate.ask', 'drafts.translating',
  'drafts.no_machine', 'drafts.mock', 'drafts.failed', 'drafts.retry', 'drafts.saving', 'drafts.saved', 'drafts.save', 'drafts.save_error',
  'drafts.export', 'drafts.exporting', 'drafts.sync', 'drafts.error.text', 'drafts.error.docx', 'drafts.error.target', 'drafts.error.load',
  'drafts.not_found', 'glossary.title', 'glossary.add', 'glossary.term_en', 'glossary.term_vi', 'glossary.remove', 'glossary.empty',
  'glossary.mismatch', 'glossary.error.term', 'glossary.error.exists', 'glossary.error.limit', 'dashboard.nav.drafts'
]);
