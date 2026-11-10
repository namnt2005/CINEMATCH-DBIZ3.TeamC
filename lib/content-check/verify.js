// Finding verification (M2 BR-001, FR-012, research R2 step 4, decision D11): keep a pair only when it cites an approved,
// active rule with a citation and an approver, and quotes a passage found verbatim in the text. Dropped pairs are counted
// with their codes, never their text.
export const MAX_QUOTE = 500;
const truthy = (v) => v === true || v === 1 || v === '1' || v === 'true';
const filled = (v) => typeof v === 'string' ? v.trim() !== '' : Boolean(v);

export const isActiveRule = (r) => r && r.status === 'approved' && truthy(r.is_active) && filled(r.citation) && filled(r.approved_by);

export function verifyFindings({ text, pairs = [], rules = [] }) {
  const source = String(text ?? '');
  const active = new Map(rules.filter(isActiveRule).map(r => [r.rule_code, r]));
  const kept = [];
  const used = new Map();            // rule_code → span starts already kept
  const dropped = new Set();
  let droppedCount = 0;
  const drop = (code) => { droppedCount++; if (typeof code === 'string' && code) dropped.add(code); };
  for (const p of pairs) {
    const code = p?.rule_code;
    const quote = typeof p?.quoted_text === 'string' ? p.quoted_text.trim() : '';
    const rule = active.get(code);
    if (!rule || !quote || quote.length > MAX_QUOTE || !source.includes(quote)) { drop(code); continue; }
    const starts = used.get(code) ?? new Set();
    let at = source.indexOf(quote);
    while (at !== -1 && starts.has(at)) at = source.indexOf(quote, at + 1);
    if (at === -1) continue;         // a repeat of a passage already kept for this rule: merged, not dropped
    starts.add(at);
    used.set(code, starts);
    kept.push({
      rule_id: rule.rule_id, rule_code: rule.rule_code, revision: Number(rule.revision ?? 1), severity: rule.severity,
      title_vi: rule.title_vi, title_en: rule.title_en, citation: rule.citation,
      description_vi: rule.description_vi, description_en: rule.description_en, guidance_vi: rule.guidance_vi, guidance_en: rule.guidance_en,
      is_sample: truthy(rule.is_sample), quoted_text: quote, span_start: at, span_end: at + quote.length
    });
  }
  kept.sort((a, b) => a.span_start - b.span_start || a.rule_code.localeCompare(b.rule_code));
  return { kept, dropped_count: droppedCount, dropped_rule_codes: [...dropped] };
}
