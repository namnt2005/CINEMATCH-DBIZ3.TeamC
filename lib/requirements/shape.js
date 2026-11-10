// The public requirements library (M2 FR-015, FR-016; SC-30, SC-31): pure shaping shared by both data sources.
// Only approved revisions in force are listed (SR-281); a retired rule still opens from an old link, marked (SR-293).
import { asRule } from '../legal/rule-shape.js';
import { TOPICS, SEGMENTS } from '../legal/input.js';
import { CheckError } from '../checks/errors.js';

const PUBLIC = ['rule_code', 'rule_slug', 'revision', 'topic', 'severity', 'segments', 'is_sample', 'title_vi', 'title_en',
  'description_vi', 'description_en', 'citation', 'rule_version'];
const DETAIL = [...PUBLIC, 'guidance_vi', 'guidance_en', 'approved_at', 'retired_version'];
const pick = (r, keys) => Object.fromEntries(keys.map(k => [k, r[k] ?? null]));
const inForce = (r) => r.status === 'approved' && r.is_active && typeof r.citation === 'string' && r.citation.trim() !== '';
const byTopicThenCode = (a, b) => (a.topic === b.topic ? (a.rule_code < b.rule_code ? -1 : 1) : a.topic < b.topic ? -1 : 1);
const latestVersion = (versions) => versions.map(v => v.rule_version).sort().at(-1) ?? null;

export function validateFilters({ topic = null, segment = null } = {}) {
  const fields = {};
  if (topic && !TOPICS.includes(topic)) fields.topic = 'requirements.error.topic';
  if (segment && !SEGMENTS.includes(segment)) fields.segment = 'requirements.error.segment';
  if (Object.keys(fields).length) throw new CheckError('VALIDATION_ERROR', fields);
  return { topic: topic || null, segment: segment || null };
}

/** SC-30: cards of the approved rules in force, filtered; topic counts follow the segment filter only (#4). */
export function listFrom(rows, versions, filters = {}) {
  const { topic, segment } = validateFilters(filters);
  const live = rows.map(asRule).filter(inForce).filter(r => !segment || r.segments.includes(segment));
  const counts = Object.fromEntries(TOPICS.map(t => [t, live.filter(r => r.topic === t).length]));
  const rules = live.filter(r => !topic || r.topic === topic).sort(byTopicThenCode).map(r => pick(r, PUBLIC));
  return { rule_version: latestVersion(versions), total: live.length, counts, rules };
}

/** SC-31: the revision in force; else the last retired revision, marked; a draft-only or unknown slug → NOT_FOUND. */
export function detailFrom(rows, versions, slug) {
  const all = rows.map(asRule).filter(r => r.rule_slug === slug);
  const live = all.find(inForce);
  const retired = all.filter(r => r.status === 'retired').sort((a, b) => b.revision - a.revision)[0];
  const r = live ?? retired;
  if (!r) throw new CheckError('NOT_FOUND');
  const rule = { ...pick(r, DETAIL), retired: !live, retired_at: null };
  if (!live) rule.retired_at = versions.find(v => v.rule_version === r.retired_version)?.created_at ?? null;
  const related = live ? rows.map(asRule).filter(x => inForce(x) && x.topic === r.topic && x.rule_code !== r.rule_code)
    .sort(byTopicThenCode).slice(0, 3).map(x => pick(x, PUBLIC)) : [];
  return { rule, related };
}
