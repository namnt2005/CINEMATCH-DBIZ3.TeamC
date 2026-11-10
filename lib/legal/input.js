// Rule fields (M2 FR-002, data-model §5, decisions D4, D17). Every error is a dictionary key in both languages.
export const TOPICS = Object.freeze(['security', 'history', 'religion', 'privacy', 'dossier', 'public_order', 'heritage']);
export const SEVERITIES = Object.freeze(['notice', 'action']);
export const SEGMENTS = Object.freeze(['A', 'B', 'C']);
const TEXTS = ['description_vi', 'description_en', 'guidance_vi', 'guidance_en'];
const text = (v) => (typeof v === 'string' ? v.trim() : '');

/** Checks the fields sent (all of them when `create`); returns { ok, errors, value } with trimmed values. */
export function validateRule(input, { create = false } = {}) {
  const f = input && typeof input === 'object' ? input : {};
  const errors = {};
  const value = {};
  const has = (k) => create || k in f;
  if (create) {
    const code = text(f.rule_code);
    if (!/^[A-Z0-9-]{1,40}$/.test(code)) errors.rule_code = 'rules.error.code';
    value.rule_code = code;
  }
  if (has('topic')) { if (!TOPICS.includes(f.topic)) errors.topic = 'rules.error.topic'; value.topic = f.topic; }
  if (has('severity')) { if (!SEVERITIES.includes(f.severity)) errors.severity = 'rules.error.severity'; value.severity = f.severity; }
  for (const k of ['title_vi', 'title_en']) {
    if (!has(k)) continue;
    const v = text(f[k]);
    if (v.length < 1 || v.length > 200) errors[k] = 'rules.error.title';
    value[k] = v;
  }
  for (const k of TEXTS) {
    if (!has(k)) continue;
    const v = text(f[k]);
    if (v.length < 1 || v.length > 4000) errors[k] = 'rules.error.text';
    value[k] = v;
  }
  if ('citation' in f) {
    const v = text(f.citation);
    if (v.length > 200) errors.citation = 'rules.error.citation';
    value.citation = v || null;
  }
  for (const k of ['keywords_vi', 'keywords_en']) {
    if (!(k in f)) continue;
    const list = f[k] ?? [];
    const ok = Array.isArray(list) && list.length <= 30 && list.every(w => typeof w === 'string' && w.trim().length >= 1 && w.trim().length <= 60);
    if (!ok) errors[k] = 'rules.error.keywords';
    else value[k] = list.map(w => w.trim());
  }
  if (has('segments')) {
    const s = f.segments;
    const ok = Array.isArray(s) && s.length >= 1 && new Set(s).size === s.length && s.every(x => SEGMENTS.includes(x));
    if (!ok) errors.segments = 'rules.error.segments';
    else value.segments = [...s];
  }
  return { ok: Object.keys(errors).length === 0, errors, value };
}
