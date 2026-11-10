// SC-03 and SC-48 view rules (specs/008-m2-check contracts/screens.contract.md; SC-48 SR-075; decisions D3, D12).
import { countWords, MIN_WORDS, MAX_WORDS } from './words.js';

export const canCheck = (text) => { const n = countWords(text); return n >= MIN_WORDS && n <= MAX_WORDS; };
export const severityKey = (severity) => `precheck.severity.${severity === 'action' ? 'action' : 'notice'}`;

/** The text cut into plain and highlighted pieces, in text order; an overlapping later passage keeps its card only. */
export function highlightSegments(text, findings = []) {
  const source = String(text ?? '');
  const ordered = [...findings].filter(f => Number.isInteger(f.span_start) && f.span_end > f.span_start).sort((a, b) => a.span_start - b.span_start || a.n - b.n);
  const out = [];
  let cursor = 0;
  for (const f of ordered) {
    if (f.span_start < cursor || f.span_end > source.length) continue;
    if (f.span_start > cursor) out.push({ text: source.slice(cursor, f.span_start), finding: null });
    out.push({ text: source.slice(f.span_start, f.span_end), finding: { n: f.n, severity: f.severity, labelKey: severityKey(f.severity), rule_code: f.rule_code } });
    cursor = f.span_end;
  }
  if (cursor < source.length) out.push({ text: source.slice(cursor), finding: null });
  return out;
}

export function resultMessage(answer) {
  if (answer?.state === 'none') return { key: 'precheck.result.none', vars: { version: answer.rule_version } };
  if (answer?.state === 'could_not_check') return { key: 'precheck.result.could_not_check', vars: {} };
  return null;
}
export const methodLineKey = (answer) => (answer?.method === 'keywords' ? 'precheck.method.keywords' : null);
export const consentVisible = (basis) => basis?.advanced_available === true;

/** SC-48 reopened (D3): the passages only from this browser's session copy of the same check; otherwise none. */
export function resultFromStored(stored, copy) {
  if (copy && copy.brief_id === stored.brief_id && typeof copy.text === 'string') {
    return { ...stored, text: copy.text, textNotKept: false, findings: copy.findings ?? stored.findings };
  }
  return { ...stored, text: null, textNotKept: true, findings: (stored.findings ?? []).map(({ quoted_text: _q, ...f }) => f) };
}

export const sessionKey = (briefId) => `cinematch.precheck.${briefId}`;
