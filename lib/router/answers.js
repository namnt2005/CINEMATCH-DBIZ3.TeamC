// The four router answers (FR-002 §5.1, specs/004-m1-router data-model §2). Pure: used by the API and the page.
// Error values are dictionary keys (SYS FR-006). A segment is never an answer (BR-001).

export const RELEASES = Object.freeze(['abroad', 'vietnam', 'both']);
export const PRODUCERS = Object.freeze(['foreign', 'vietnamese', 'coproduction']);
export const NEEDS = Object.freeze(['locations', 'crew', 'cast', 'equipment', 'logistics']);
export const SEGMENTS = Object.freeze(['A', 'B', 'C']);

const empty = (v) => v === undefined || v === null || v === '';

/** @returns {{ ok: boolean, errors: Record<string,string>, value: { q1_shoot_in_vn, q2_release, q3_producer, q4_needs } }} */
export function validateAnswers(input) {
  const body = input && typeof input === 'object' ? input : {};
  const errors = {};
  const q1 = body.q1_shoot_in_vn;
  if (q1 !== true && q1 !== false) errors.q1_shoot_in_vn = 'router.error.choose';

  const choice = (field, values) => {
    const v = body[field];
    if (q1 === false) {
      // Questions 2 and 3 are not asked when the production does not shoot in Vietnam
      if (!empty(v)) errors[field] = 'router.error.not_asked';
      return null;
    }
    if (empty(v)) {
      if (q1 === true) errors[field] = 'router.error.choose';
      return null;
    }
    if (!values.includes(v)) { errors[field] = 'router.error.invalid'; return null; }
    return v;
  };
  const q2 = choice('q2_release', RELEASES);
  const q3 = choice('q3_producer', PRODUCERS);

  let q4 = [];
  if (!empty(body.q4_needs)) {
    const list = body.q4_needs;
    if (!Array.isArray(list) || !list.every(n => NEEDS.includes(n)) || new Set(list).size !== list.length) {
      errors.q4_needs = 'router.error.invalid';
    } else {
      q4 = [...list];
    }
  }
  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { q1_shoot_in_vn: q1 === true || q1 === false ? q1 : null, q2_release: q2, q3_producer: q3, q4_needs: q4 }
  };
}

/** BR-003: an override is one of the three segments. */
export function validateOverride(input) {
  const s = input?.segment_override;
  return SEGMENTS.includes(s)
    ? { ok: true, errors: {}, value: { segment_override: s } }
    : { ok: false, errors: { segment_override: 'router.error.invalid' }, value: {} };
}
