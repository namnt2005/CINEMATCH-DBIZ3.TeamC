// SC-37 view rules (M2 FR-001..FR-004; SC-37 #8–#22; decisions D2, D4, D17).
const REQUIRED = ['title_vi', 'title_en', 'description_vi', 'description_en', 'guidance_vi', 'guidance_en', 'citation'];

export function rowActions(rule) {
  if (rule.status === 'draft') return ['edit'];
  if (rule.status === 'approved') return rule.has_draft ? ['retire'] : ['retire', 'revise'];
  return ['view'];
}

/** The required fields still empty before *Approve and sign* (#21); the database CHECK refuses a missing citation anyway. */
export function missingForSign(rule) {
  const out = REQUIRED.filter(k => typeof rule[k] !== 'string' || !rule[k].trim());
  if (!Array.isArray(rule.segments) || rule.segments.length === 0) out.push('segments');
  return out;
}
export const canSign = (rule) => missingForSign(rule).length === 0;

export const historyRows = (versions) => [...versions].sort((a, b) => (a.rule_version < b.rule_version ? 1 : a.rule_version > b.rule_version ? -1 : 0));
