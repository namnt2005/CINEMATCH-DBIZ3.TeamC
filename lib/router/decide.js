// Segment router (M1): the segment comes only from VFDA's decision table segment_rule, never from a
// language model or from code (BR-001, FR-002, SR-032). Pure, with no server import, so the SC-02 page
// computes the result instantly in the browser and the API recomputes the stored result the same way.
// specs/004-m1-router research R1–R3, R7.

const parts = (version) => String(version).split('.').map(n => Number.parseInt(n, 10) || 0);

/** Versions compare as numbers, part by part: 2026.10 is newer than 2026.9. */
export function compareVersions(a, b) {
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  }
  return 0;
}

/** The rules of the newest version; older versions are kept in the table and never used (BR-001). */
export function currentRules(rules) {
  if (rules.length === 0) return [];
  const newest = rules.map(r => r.version).reduce((a, b) => (compareVersions(a, b) >= 0 ? a : b));
  return rules.filter(r => compareVersions(r.version, newest) === 0);
}

// An empty rule column accepts any answer (the C rule: questions 2 and 3 are not asked)
const matches = (rule, a) => rule.q1_shoot_in_vn === a.q1_shoot_in_vn
  && (rule.q2_release == null || rule.q2_release === a.q2_release)
  && (rule.q3_producer == null || rule.q3_producer === a.q3_producer);

const NO_MATCH = Object.freeze({ segment: null, segment_rule_id: null, decided_by: [], matched: false });

/**
 * @param {{ q1_shoot_in_vn: boolean, q2_release?: string|null, q3_producer?: string|null, q4_needs?: string[] }} answers
 * @param {object[]} rules rows of segment_rule (any versions)
 * @returns {{ segment: 'A'|'B'|'C'|null, segment_rule_id: string|null, decided_by: number[], matched: boolean }}
 */
export function decide(answers, rules) {
  // Spec §3 edge case: not shooting in Vietnam yet needing locations contradicts itself — no rule applies.
  // Question 4 never picks a segment (BR-002); it can only leave such answers unclassified.
  if (answers.q1_shoot_in_vn === false && (answers.q4_needs || []).includes('locations')) return { ...NO_MATCH, decided_by: [] };
  const found = currentRules(rules).filter(r => matches(r, answers));
  if (found.length !== 1) return { ...NO_MATCH, decided_by: [] };
  const [rule] = found;
  const decidedBy = [1];
  if (rule.q2_release != null) decidedBy.push(2);
  if (rule.q3_producer != null) decidedBy.push(3);
  return { segment: rule.result_segment, segment_rule_id: rule.segment_rule_id, decided_by: decidedBy, matched: true };
}

/** US-1 Scenario 2: the Needed / Not needed list of a segment, read from segment_requirement, in the page language. */
// M0 gauge rows share segment_requirement (specs/005-m0-workspace D1); they are not requirements of the segment
const isGauge = (r) => r.requirement_code.startsWith('GAUGE_');
const GAUGE_ORDER = ['content', 'locations', 'partners', 'dossier', 'logistics'];

export function splitRequirements(segment, requirements, locale = 'vi') {
  const rows = requirements.filter(r => r.segment === segment && !isGauge(r))
    .sort((a, b) => a.requirement_code.localeCompare(b.requirement_code));
  const item = (r) => ({ code: r.requirement_code, label: locale === 'en' ? r.label_en : r.label_vi });
  return { needed: rows.filter(r => r.needed).map(item), not_needed: rows.filter(r => !r.needed).map(item) };
}

/** Clarifications Q2: a segment C result always carries "not legal advice — confirm with VFDA". */
export const needsLegalCaveat = (segment) => segment === 'C';

/**
 * FR-002 journey_config (research R7): what the rest of the product configures from the decision.
 * The gauges are the counted GAUGE_* rows of the segment (M0 BR-002, BR-004), not the segment letter.
 */
export function journeyConfig(segment, requirements, needs = []) {
  if (!segment) return null;
  const rows = requirements.filter(r => r.segment === segment && !isGauge(r));
  const needed = rows.filter(r => r.needed).map(r => r.requirement_code).sort();
  const counted = requirements.filter(r => r.segment === segment && isGauge(r) && r.needed)
    .map(r => r.requirement_code.slice('GAUGE_'.length).toLowerCase());
  const gauges = GAUGE_ORDER.filter(g => counted.includes(g));
  return { needed, not_needed: rows.filter(r => !r.needed).map(r => r.requirement_code).sort(), needs: [...needs], gauges };
}
