// SC-21 and SC-22 view rules (M4 FR-001, FR-008, BR-001, BR-004, SR-326, SR-332, SR-333, SR-132), pure.
import { shapeProfile } from '../../../lib/partners/layers.js';
import { validateOrgProfile } from '../../../lib/partners/input.js';

// SR-326: the badge, the Article 13 flag, the status and the slug are VFDA's
export const EDITABLE_FIELDS = ['org_name', 'legal_form', 'founded_year', 'hq_province', 'service_groups', 'provinces', 'capability_desc_vi',
  'capability_desc_en', 'portfolio', 'working_languages', 'rate_card', 'past_clients', 'direct_contact'];
export const PORTFOLIO_HINT = 'org.portfolio_hint';
// SC-22 #10 (BR-004, SR-333; draft wording, research OQ5)
export const CHECKS_KEYS = ['verification.checks.title', 'partners.checked.what', 'partners.checked.not'];
export const MAX_PDF = 25 * 1024 * 1024;

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
export const changedFields = (base, draft) => EDITABLE_FIELDS.filter(k => k in draft && !same(base[k], draft[k]));

/** SC-21 #17: something changed and fields #4–#7 are valid. */
export function canSave(base, draft) {
  const changed = changedFields(base, draft);
  if (!changed.length) return false;
  const core = { org_name: draft.org_name, legal_form: draft.legal_form, service_groups: draft.service_groups, provinces: draft.provinces };
  return validateOrgProfile(Object.fromEntries(changed.map(k => [k, draft[k]]))).ok && validateOrgProfile(core).ok;
}

/** SC-21 #15: the profile as a guest, a member or an accepted partner would see it — the shaping of SC-20. */
export function previewAs(mine, kind) {
  return shapeProfile({ org: mine.organisation, member: kind === 'guest' ? null : mine.member, priv: kind === 'accepted' ? mine.private : null, approved: null, myRequest: null },
    { today: '0000-01-01', signedIn: kind !== 'guest' });
}

/** SC-22 #7: the submission checklist. */
export function checklist({ file, references, pending }) {
  return {
    file: Boolean(file) && file.type === 'application/pdf' && Number(file.size) > 0 && Number(file.size) <= MAX_PDF,
    references: (references || []).filter(r => String(r || '').trim()).length >= 2,
    not_pending: !pending
  };
}

/** SC-22 #8, SR-332: Submit when the checklist is complete and nothing is pending. */
export const canSubmit = (state) => Object.values(checklist(state)).every(Boolean);
