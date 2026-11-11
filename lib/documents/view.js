// SC-26 view rules (M5 FR-001..FR-003, BR-003, Q1, SR-153; analysis G1, I3, U3). No node: import: the client uses it.
export const BASIS_ORDER = Object.freeze(['law', 'common', 'location']);
export const basisKey = (basis) => `documents.basis.${basis}`;
export const stateKey = (state) => `dossier.state.${state}`;            // the same labels as SC-27 (SR-153)
export const awaitingKey = (row) => (row?.awaiting_confirmation ? 'documents.awaiting' : null);

// The seed's template links are placeholders until VFDA provides the forms (research Open question 12)
const PLACEHOLDER = /^https:\/\/storage\.cinematch\.example\//;
export function templateView(url) {
  if (!url) return { href: null, pendingKey: null };
  if (PLACEHOLDER.test(url)) return { href: null, pendingKey: 'documents.template.pending' };
  return { href: url, pendingKey: null };
}

// Rows whose state comes from another module and that therefore take no upload (U3), and the Article 13 component c,
// whose row also links to the partnership request (SC-26 #10).
export const FROM_M7 = 'PROVINCIAL_NOTICE_COPY';
const COMPONENT_C = 'A13_SERVICE_AGREEMENT';

/** Row actions in display order: view / upload / replace, request (component c), the SC-32 link, and Draft bilingual. */
export function rowActions(row, { editable = false } = {}) {
  if (row.doc_code === FROM_M7) return [row.state === 'present' ? 'notice_view' : 'notice', 'draft'];
  const out = [];
  if (row.latest) out.push('view');
  if (editable) out.push(row.latest ? 'replace' : 'upload');
  if (row.doc_code === COMPONENT_C) out.push('request');
  out.push('draft');
  return out;
}
export const uploadable = (row) => row.doc_code !== FROM_M7;

export function progressView({ present = 0, total = 0 } = {}) {
  return { present, total, pct: total ? Math.round((present / total) * 100) : 0 };
}

export const DOCUMENTS_KEYS = Object.freeze([
  'documents.meta.title', 'documents.title', 'documents.segment', 'documents.chips', 'documents.viewing',
  'documents.basis.law', 'documents.basis.common', 'documents.basis.location', 'documents.awaiting',
  'documents.template.download', 'documents.template.pending', 'documents.location_note', 'documents.progress',
  'documents.progress.link', 'documents.differences', 'documents.differences.needed', 'documents.differences.not_needed',
  'documents.action.view', 'documents.action.upload', 'documents.action.replace', 'documents.action.request',
  'documents.action.notice', 'documents.action.notice_view', 'documents.action.draft', 'documents.versions',
  'documents.version', 'documents.upload.area', 'documents.upload.choose', 'documents.upload.limit',
  'documents.upload.suggest', 'documents.upload.pick', 'documents.upload.confirm', 'documents.upload.progress',
  'documents.upload.done', 'documents.upload.failed', 'documents.error.type', 'documents.error.size',
  'documents.error.not_in_kit', 'documents.error.not_uploadable', 'documents.error.load', 'documents.retry',
  'dossier.state.present', 'dossier.state.needs_fix', 'dossier.state.pending', 'dossier.state.missing',
  'dashboard.nav.documents'
]);
