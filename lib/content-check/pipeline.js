// The pre-check pipeline shared by both data sources (research R2): input → active rules → passages (model or keywords)
// → verification by code → level by code → the answer. The caller records it; nothing here stores anything.
import { validatePrecheckInput, synopsisHash } from './input.js';
import { findPassages } from './matcher.js';
import { verifyFindings } from './verify.js';
import { attentionLevel } from './attention.js';
import { CheckError } from '../checks/errors.js';

const list = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? JSON.parse(v) : []);
export const asRule = (r) => ({ ...r, keywords_vi: list(r.keywords_vi), keywords_en: list(r.keywords_en), segments: list(r.segments) });

export async function precheckAnswer(input, { rules, version }, options = {}) {
  const checked = validatePrecheckInput(input);
  if (!checked.ok) throw new CheckError('VALIDATION_ERROR', checked.errors);
  const { text, lang, flags, consent_advanced: consent } = checked.value;
  const { pairs, method } = await findPassages({ text, lang, rules, consent }, options);
  const { kept, dropped_count: droppedCount, dropped_rule_codes: droppedCodes } = verifyFindings({ text, pairs, rules });
  const state = kept.length ? 'findings' : droppedCount ? 'could_not_check' : 'none';
  const findings = kept.map((f, i) => ({ n: i + 1, ...f }));
  return {
    answer: {
      rule_version: version, method, state, attention_level: state === 'could_not_check' ? null : attentionLevel(kept),
      counts: { action: kept.filter(f => f.severity === 'action').length, notice: kept.filter(f => f.severity === 'notice').length },
      dropped_count: droppedCount, dropped_rule_codes: droppedCodes, findings
    },
    record: {
      hash: synopsisHash(text), lang, flags, rule_version: version, dropped_count: droppedCount, dropped_rule_codes: droppedCodes,
      findings: kept.map(f => ({ rule_id: f.rule_id, span_start: f.span_start, span_end: f.span_end }))
    }
  };
}

/** The level a record may store (BR-004): recomputed from the severities of the rules it cites. */
export function recordLevel(severities, droppedCount) {
  if (severities.length === 0 && droppedCount > 0) return null;
  return attentionLevel(severities.map(severity => ({ severity })));
}
