// Pure view rules of SC-12 Readiness dashboard (docs/screens/screen-spec-SC-12.md; specs/005-m0-workspace T027).
// Display only: scores, total and next steps come from v_project_readiness (BR-001, SR-052).
import { GAUGES } from '../../../lib/readiness/next-steps.js';

const NOT_SCORED = '—';
// SC-12 #8: only screens that exist are links. SC-48 (project), SC-25 and SC-27 exist since M4 and M2 (M2 plan D19,
// 09/11/2026); without a project id they still say *coming soon*.
const BUTTONS = {
  content: (id) => (id ? { href: `/projects/${id}/content`, label: 'dashboard.action.content' } : { soon: true, label: 'dashboard.action.content' }),
  locations: () => ({ href: '/locations/match', label: 'dashboard.action.locations' }),
  partners: (id) => (id ? { href: `/requests?project=${id}`, label: 'dashboard.action.partners' } : { soon: true, label: 'dashboard.action.partners' }),
  dossier: (id) => (id ? { href: `/projects/${id}/dossier`, label: 'dashboard.action.dossier' } : { soon: true, label: 'dashboard.action.dossier' }),
  logistics: () => ({ phase2: true, label: 'dashboard.phase2' })
};

/** BR-004: the segment's gauges, their labels and whether they count, from the GAUGE_* rows. */
export function gaugeLabels(requirements, segment, locale = 'vi') {
  const rows = requirements.filter(r => r.segment === segment && r.requirement_code.startsWith('GAUGE_'));
  return GAUGES.map((gauge) => {
    const row = rows.find(r => r.requirement_code === `GAUGE_${gauge.toUpperCase()}`);
    return row ? { gauge, label: locale === 'en' ? row.label_en : row.label_vi, counted: row.needed === true || row.needed === 'true' } : null;
  }).filter(Boolean);
}

const shown = (row) => String(row?.gauges_shown || '').split(',').filter(Boolean);
const scoreOf = (row, gauge) => {
  const v = row?.[`${gauge}_score`];
  return v === null || v === undefined ? null : Number(v);
};

/**
 * One card per gauge shown for the segment (BR-002). Without a view row (US-2 Scenario 3) every card
 * shows — and no next step, never a fake 0 % (SR-054).
 */
export function gaugeCards(row, labels, projectId = null) {
  const list = row ? labels.filter(l => shown(row).includes(l.gauge)) : labels;
  return list.map(({ gauge, label, counted }) => {
    const score = row ? scoreOf(row, gauge) : null;
    return {
      gauge, label, counted, score,
      display: score === null ? NOT_SCORED : String(Math.round(score)),
      action: row ? row[`${gauge}_action`] ?? null : null,
      // M0 §3 edge case (H1): the module has not reported — — with "not calculated yet"
      notReported: Boolean(row) && row[`${gauge}_action`] === 'not_reported',
      button: BUTTONS[gauge](projectId)
    };
  });
}

/**
 * SC-12 #5: readiness_total as an integer; the error state when the view gave nothing (US-2 Scenario 3).
 * H1: when some counted gauges have not reported, the note says the total uses only the others.
 */
export function overall(row) {
  if (!row) return { display: NOT_SCORED, value: null, error: 'dashboard.error', retry: 'dashboard.retry' };
  const counted = Number(row.gauges_counted) || 0;
  const reported = row.gauges_reported === undefined || row.gauges_reported === null ? counted : Number(row.gauges_reported);
  if (row.readiness_total === null || row.readiness_total === undefined) {
    return { display: NOT_SCORED, value: null, counted, note: { key: 'dashboard.none_reported' } };
  }
  const value = Math.round(Number(row.readiness_total));
  const note = reported < counted
    ? { key: 'dashboard.overall_partial', vars: { reported, counted } }
    : { key: 'dashboard.overall_note', vars: { count: counted } };
  return { display: String(value), value, counted, note };
}
