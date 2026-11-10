// Banned words (M2 BR-003, SC-48 SR-074, SC-27 #5, research R11, decision D8): no result text says these, in either
// language, including the no-finding text. tests/unit/banned-words.test.js reads every result key against this list.
export const BANNED_WORDS = Object.freeze({
  en: Object.freeze(['approved', 'accepted', 'legally compliant', 'compliant', 'safe', 'passed', 'permitted']),
  vi: Object.freeze(['được duyệt', 'được phê duyệt', 'được chấp thuận', 'chấp nhận', 'hợp pháp', 'an toàn', 'đạt', 'được phép'])
});

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PATTERNS = Object.fromEntries(Object.entries(BANNED_WORDS).map(([lang, words]) =>
  [lang, words.map(w => [w, new RegExp(`(?<![\\p{L}\\p{N}])${escape(w)}(?![\\p{L}\\p{N}])`, 'iu')])]));

/** The banned words or phrases found in `text` (whole words only, case-insensitive). */
export function findBanned(text, lang) {
  return (PATTERNS[lang] ?? []).filter(([, re]) => re.test(String(text ?? ''))).map(([w]) => w);
}

/** Every message the M2 APIs and result screens can show for a check result (BR-003). */
export const RESULT_MESSAGE_KEYS = Object.freeze([
  'precheck.result.none', 'precheck.result.could_not_check', 'precheck.result.unavailable', 'precheck.method.keywords',
  'precheck.text_not_kept', 'checks.api.rate_limited', 'checks.api.check_unavailable', 'checks.api.rule_set_changed',
  'dossier.verdict.complete', 'dossier.verdict.not_ready'
]);
