// Pure view rules of SC-10 My projects (docs/screens/screen-spec-SC-10.md; specs/005-m0-workspace T017).
// Nothing here computes a score: readiness comes from v_project_readiness (BR-001).
import { FORMATS, SEGMENTS, NAME_MAX } from '../../lib/projects/input.js';

const TAB_ORDER = ['preparing', 'draft', 'archived'];

/** US-1 Scenario 1: ?new=1 opens the panel; ?segment= from the router pre-selects a valid segment. */
export function panelFromQuery(params) {
  const segment = params?.get?.('segment') || '';
  return { open: params?.get?.('new') === '1', segment: SEGMENTS.includes(segment) ? segment : '' };
}

/** SC-10 #16: *Create project* only when name, format and segment are valid. */
export function canCreate(form) {
  const name = typeof form?.project_name === 'string' ? form.project_name.trim() : '';
  return name.length > 0 && name.length <= NAME_MAX && FORMATS.includes(form.format) && SEGMENTS.includes(form.segment);
}

const ddmmyyyy = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
const dayNumber = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; };

/** SC-10 #6 / SC-12 #4: the shoot date and the days remaining, for display only. */
export function shootLine(shootDate, today, prefix = 'projects.card') {
  if (!shootDate) return { key: `${prefix}.date_not_set` };
  const days = Math.round(dayNumber(shootDate) - dayNumber(today));
  return days < 0
    ? { key: `${prefix}.date_passed`, vars: { date: ddmmyyyy(shootDate) } }
    : { key: `${prefix}.date_days`, vars: { date: ddmmyyyy(shootDate), days } };
}

/** The tab shown first: Preparing, or Draft when only drafts exist. */
export function defaultStage(counts) {
  return !counts?.preparing && counts?.draft ? 'draft' : 'preparing';
}

/** SC-10 #3: tabs Preparing / Draft / Archived with the counts from the API. */
export function tabs(counts, stage) {
  const active = stage || defaultStage(counts);
  return TAB_ORDER.map(s => ({ stage: s, count: counts?.[s] ?? 0, active: s === active }));
}

/** SC-10 #5: the view's readiness_total shown as an integer (SC-12 #5); null stays unknown. */
export const readinessLabel = (total) => (total === null || total === undefined ? null : Math.round(Number(total)));
