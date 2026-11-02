// SC-08 *Save changes* (FR-004, FR-005): the editable fields only. Email, role and status are never
// editable here (SR-231, SR-232, BR-002). Lengths follow FR-001 and data/schema (research Open question 18).
import { isCountryCode } from './countries.js';
import { CREW_ROLES, LOCALES } from './signup-input.js';

export const PROFILE_FIELDS = Object.freeze(['full_name', 'crew_role', 'locale']);
export const ORGANISATION_FIELDS = Object.freeze(['org_name', 'country', 'website']);
const EDITABLE = new Set([...PROFILE_FIELDS, ...ORGANISATION_FIELDS]);

/** @returns {{ ok: boolean, errors: Record<string,string>, profile: object, organisation: object }} */
export function validateAccountPatch(input) {
  const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const errors = {};
  const profile = {};
  const organisation = {};
  for (const key of Object.keys(body)) if (!EDITABLE.has(key)) errors[key] = 'account.error.not_editable';

  const text = (v) => (typeof v === 'string' ? v.trim() : '');
  if ('full_name' in body) {
    const v = text(body.full_name);
    if (!v) errors.full_name = 'signup.error.full_name_required';
    else if (v.length > 120) errors.full_name = 'signup.error.full_name_long';
    else profile.full_name = v;
  }
  if ('crew_role' in body) {
    if (CREW_ROLES.includes(body.crew_role)) profile.crew_role = body.crew_role;
    else errors.crew_role = 'signup.error.crew_role_invalid';
  }
  if ('locale' in body) {
    if (LOCALES.includes(body.locale)) profile.locale = body.locale;
    else errors.locale = 'account.error.locale_invalid';
  }
  if ('org_name' in body) {
    const v = text(body.org_name);
    if (!v) errors.org_name = 'signup.error.org_name_required';
    else if (v.length > 200) errors.org_name = 'signup.error.org_name_long';
    else organisation.org_name = v;
  }
  if ('country' in body) {
    const v = text(body.country).toUpperCase();
    if (isCountryCode(v)) organisation.country = v;
    else errors.country = 'signup.error.country_invalid';
  }
  if ('website' in body) {
    const v = text(body.website);
    let valid = v.length <= 300;
    if (v && valid) {
      try { valid = ['http:', 'https:'].includes(new URL(v).protocol); } catch { valid = false; }
    }
    if (valid) organisation.website = v || null;
    else errors.website = 'signup.error.website_invalid';
  }
  return { ok: Object.keys(errors).length === 0, errors, profile, organisation };
}

/** BR-005 / SR-234: the deletion is confirmed by typing DELETE exactly. */
export const deletionConfirmed = (body) => body?.confirm === 'DELETE';

/** The anonymous sign-in email that replaces the real one (same form as the seed's former members). */
export const anonymisedEmail = (userId) => `former-member-${userId}@anonymised.example`;
