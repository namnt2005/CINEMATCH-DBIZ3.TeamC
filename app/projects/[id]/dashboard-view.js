// Pure view rules of SC-12 Readiness dashboard (docs/screens/screen-spec-SC-12.md; specs/005-m0-workspace T027).
// Display only: scores, total and next steps come from v_project_readiness (BR-001, SR-052).
import { GAUGES } from '../../../lib/readiness/next-steps.js';

const NOT_SCORED = '—';
// SC-12 #8: only screens that exist are links; the others say *coming soon* (SC-48, SC-25, SC-27 not built)
const BUTTONS = {
  content: { soon: true, label: 'dashboard.action.content' },
  locations: { href: '/locations/match', label: 'dashboard.action.locations' },
  partners: { soon: true, label: 'dashboard.action.partners' },
  dossier: { soon: true, label: 'dashboard.action.dossier' },
  logistics: { phase2: true, label: 'dashboard.phase2' }
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
export function gaugeCards(row, labels) {
  const list = row ? labels.filter(l => shown(row).includes(l.gauge)) : labels;
  return list.map(({ gauge, label, counted }) => {
    const score = row ? scoreOf(row, gauge) : null;
    return {
      gauge, label, counted, score,
      display: score === null ? NOT_SCORED : String(Math.round(score)),
      action: row ? row[`${gauge}_action`] ?? null : null,
      button: BUTTONS[gauge]
    };
  });
}

/** SC-12 #5: readiness_total as an integer; the error state when the view gave nothing. */
export function overall(row) {
  if (!row || row.readiness_total === null || row.readiness_total === undefined) {
    return { display: NOT_SCORED, value: null, error: 'dashboard.error', retry: 'dashboard.retry' };
  }
  const value = Math.round(Number(row.readiness_total));
  return { display: String(value), value, counted: Number(row.gauges_counted) || 0 };
}
