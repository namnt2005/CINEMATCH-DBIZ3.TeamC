// SC-19 directory (FR-002, FR-005, FR-006, BR-002): active organisations, the filters, the 12 group counts.
// Pure: the data source hands in the rows it was allowed to read (guests get no member layer).
import { removeDiacritics } from '../db/search-core.js';
import en from '../i18n/en.json' with { type: 'json' };
import vi from '../i18n/vi.json' with { type: 'json' };
import { SERVICE_GROUPS } from './service-groups.js';
import { isVerified, verifiedMonth } from './badge.js';

const fold = (s) => removeDiacritics(String(s || '')).toLowerCase();
const groupWords = (groups) => groups.map(g => `${en[`partners.group.${g}`] || ''} ${vi[`partners.group.${g}`] || ''}`).join(' ');

/** One card of the public layer, plus the member line for signed-in callers. */
export function card(org, memberLayer, { today, signedIn }) {
  const verified = isVerified(org, today);
  const out = {
    slug: org.slug, org_name: org.org_name, service_groups: org.service_groups, provinces: org.provinces,
    verified, verified_month: verifiedMonth(org, today), art13_eligible: Boolean(org.art13_eligible) && verified
  };
  if (signedIn && memberLayer) out.member = { intl_project_count: Number(memberLayer.intl_project_count ?? 0), working_languages: memberLayer.working_languages || [] };
  return out;
}

/** Filters, sorts (verified first, then name) and counts per group over the same filtered set. */
export function buildDirectory(orgs, memberLayers, filters, { today, signedIn }) {
  const byOrg = new Map((memberLayers || []).map(m => [m.org_id, m]));
  const q = fold(filters.q);
  const base = orgs.filter(o => o.org_status !== 'deactivated')
    .filter(o => !filters.verified_only || isVerified(o, today))
    .filter(o => filters.province == null || o.provinces.includes(filters.province))
    .filter(o => !signedIn || !filters.language || (byOrg.get(o.org_id)?.working_languages || []).includes(filters.language))
    .filter(o => !q || fold(o.org_name).includes(q) || fold(groupWords(o.service_groups)).includes(q));
  const groups = SERVICE_GROUPS.map(value => ({ value, count: base.filter(o => o.service_groups.includes(value)).length }));
  const shown = base.filter(o => !filters.group || o.service_groups.includes(filters.group))
    .sort((a, b) => Number(isVerified(b, today)) - Number(isVerified(a, today)) || a.org_name.localeCompare(b.org_name, 'vi'));
  return { groups, organisations: shown.map(o => card(o, byOrg.get(o.org_id), { today, signedIn })) };
}
