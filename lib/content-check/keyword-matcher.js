// Deterministic keyword match (M2 plan D4, research R3): the keywords the VFDA Legal Board signed with each rule, in the
// summary's language, as whole words, case-insensitive. At one place the longest keyword wins; matches of one rule never
// overlap. Returns { rule_code, quoted_text } pairs (the text as written), which then go through verifyFindings().
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const list = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? JSON.parse(v) : []);

export function matchKeywords({ text, lang, rules = [] }) {
  const source = String(text ?? '');
  const out = [];
  for (const rule of rules) {
    const words = list(lang === 'vi' ? rule.keywords_vi : rule.keywords_en).filter(w => typeof w === 'string' && w.trim());
    const hits = [];
    for (const w of words) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${escape(w.trim())}(?![\\p{L}\\p{N}])`, 'giu');
      for (const m of source.matchAll(re)) hits.push({ start: m.index, end: m.index + m[0].length });
    }
    hits.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    let cursor = -1;
    for (const h of hits) {
      if (h.start < cursor) continue;
      out.push({ rule_code: rule.rule_code, quoted_text: source.slice(h.start, h.end), start: h.start });
      cursor = h.end;
    }
  }
  return out.sort((a, b) => a.start - b.start).map(({ rule_code, quoted_text }) => ({ rule_code, quoted_text }));
}
