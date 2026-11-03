// Shared by both sources of lib/db/router.js: typed rows and the override rule (BR-003, research R6).
const bool = (v) => v === true || v === 'true' || v === 1 || v === '1';
const nullable = (v) => (v === '' || v === undefined ? null : v);

export const asRule = (r) => ({
  segment_rule_id: r.segment_rule_id, q1_shoot_in_vn: bool(r.q1_shoot_in_vn), q2_release: nullable(r.q2_release),
  q3_producer: nullable(r.q3_producer), result_segment: r.result_segment, version: r.version
});

export const asRequirement = (r) => ({
  segment: r.segment, requirement_code: r.requirement_code, label_vi: r.label_vi, label_en: r.label_en, needed: bool(r.needed)
});

/** The picked card becomes the segment; the rule's own segment clears the override (BR-003). */
export function overrideValues(ruleSegment, picked) {
  return picked === ruleSegment ? { segment: picked, segment_override: null } : { segment: picked, segment_override: picked };
}
