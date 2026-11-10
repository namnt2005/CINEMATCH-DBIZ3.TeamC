// SC-30 and SC-31 view rules (M2 FR-015, FR-016; D15 sample label; SC-30 #9 severity labels; SR-282 citation).

export const severityKey = (severity) => `precheck.severity.${severity}`;
export const topicKey = (topic) => `rules.topic.${topic}`;

export function cardView(rule, lang) {
  return {
    code: rule.rule_code, title: lang === 'vi' ? rule.title_vi : rule.title_en, topicKey: topicKey(rule.topic), severityKey: severityKey(rule.severity),
    citation: rule.citation, version: rule.rule_version, sampleKey: rule.is_sample ? 'rules.sample' : null, href: `/requirements/${rule.rule_slug}`
  };
}

/** SR-282: a rule without a citation is never shown, even if the data layer let one through. */
export const visibleCards = (rules, lang) => rules.filter(r => typeof r.citation === 'string' && r.citation.trim()).map(r => cardView(r, lang));

export function filterHref({ topic = null, segment = null } = {}) {
  const q = new URLSearchParams();
  if (topic) q.set('topic', topic);
  if (segment) q.set('segment', segment);
  const s = q.toString();
  return s ? `/requirements?${s}` : '/requirements';
}

export const REQUIREMENTS_KEYS = Object.freeze([
  'requirements.meta.title', 'requirements.title', 'requirements.rule_set', 'requirements.filter.topic', 'requirements.filter.all_topics',
  'requirements.filter.segment', 'requirements.filter.all', 'router.segment.A', 'router.segment.B', 'router.segment.C',
  'requirements.topic_count', 'requirements.empty', 'requirements.empty.back', 'requirements.read', 'requirements.version', 'requirements.cta',
  'requirements.disclaimer', 'requirements.error.topic', 'requirements.error.segment', 'requirements.error.load',
  'requirements.detail.breadcrumb', 'requirements.detail.segments', 'requirements.detail.version', 'requirements.detail.description',
  'requirements.detail.guidance', 'requirements.detail.citation', 'requirements.detail.check', 'requirements.detail.consult',
  'requirements.detail.related', 'requirements.detail.retired', 'requirements.detail.not_found', 'requirements.detail.back',
  'rules.sample', 'precheck.severity.notice', 'precheck.severity.action'
]);
