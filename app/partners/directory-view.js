// SC-19 and SC-20 view rules (M4 FR-002..FR-006, BR-001, BR-004, Q3), pure so the pages and their tests share them.
export const FILTER_KEYS = ['q', 'group', 'province', 'language', 'verified_only'];
// SC-20 #10, SC-22 #10 (BR-004, Q2): what VFDA checked — and what it did not; draft wording for VFDA (research OQ5)
export const CHECKED_KEYS = ['partners.checked.title', 'partners.checked.what', 'partners.checked.not', 'partners.checked.references'];

/** #4–#6: filters from the URL; Verified only is on unless the URL says false (SR-123). */
export function filtersFromSearch(params) {
  const get = (k) => (params.get ? params.get(k) : params[k]) ?? '';
  return { q: String(get('q')), group: String(get('group')), province: String(get('province')), language: String(get('language')),
    verified_only: String(get('verified_only')) !== 'false' };
}

/** The query string of a filter set; the defaults write nothing. */
export function searchFromFilters(f) {
  const out = new URLSearchParams();
  for (const k of ['q', 'group', 'province', 'language']) if (f[k]) out.set(k, f[k]);
  if (f.verified_only === false) out.set('verified_only', 'false');
  return out.toString();
}

/** #5: languages belong to the member layer, so the filter is for signed-in users only (research OQ7). */
export const showLanguageFilter = (signedIn) => Boolean(signedIn);

/** #10: the member line of a card, or null for guests. */
export const memberLine = (card) => (card?.member
  ? { count: card.member.intl_project_count, languages: (card.member.working_languages || []).map(l => l.toUpperCase()) } : null);

/** #11: guests sign in first and come back to SC-23. */
export const sendRequestHref = (slug, signedIn) =>
  (signedIn ? `/partners/${slug}/request` : `/login?next=${encodeURIComponent(`/partners/${slug}/request`)}`);

/** #7: initials stand in for the logo (no logo column, research OQ10). */
export const initials = (name) => String(name || '').split(/\s+/).filter(w => /^\p{L}/u.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('');

/** #12: *Not verified* shows only when *Verified only* is off. */
export const showNotVerified = (card, verifiedOnly) => !card.verified && !verifiedOnly;

/** SC-20 #12: the three-layer indicator, from the layers the API returned. */
export const layerIndicator = (layers) => ['public', 'member', 'private'].map(layer => ({ layer, open: Boolean(layers?.[layer]) }));

/** SC-20 #13: Send, View request, or nothing for a deactivated organisation. */
export function requestAction(myRequest, signedIn, slug, { active = true } = {}) {
  if (!active) return { kind: 'none', href: null };
  if (myRequest) return { kind: 'view', href: `/requests/${myRequest.request_id}` };
  return { kind: 'send', href: sendRequestHref(slug, signedIn) };
}

/** SC-20 #6, Q3: the Article 13 badge while Verified only, always with *not legal advice* (research OQ6). */
export const art13Badge = (org) => (org?.art13_eligible && org?.verified
  ? { label: 'partners.art13.badge', disclaimer: 'partners.art13.not_legal_advice' } : null);
