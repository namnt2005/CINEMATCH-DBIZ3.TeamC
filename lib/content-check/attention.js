// Attention level (M2 BR-004, Clarifications Q4): from the verified findings and the severity of the rules they cite —
// never from a model score. High = 2+ action; Medium = 1 action or 3+ notice; otherwise Low. SQL twin in
// app_record_precheck (20261108000100_m2_check.sql).
export const LEVELS = Object.freeze(['low', 'medium', 'high']);

export function attentionLevel(findings = []) {
  const action = findings.filter(f => f.severity === 'action').length;
  const notice = findings.filter(f => f.severity === 'notice').length;
  if (action >= 2) return 'high';
  if (action === 1 || notice >= 3) return 'medium';
  return 'low';
}
