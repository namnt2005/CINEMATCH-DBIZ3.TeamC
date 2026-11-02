// Sign-up form check (FR-001, specs/003-sys-core research R16). Pure: used by the API route and by the
// SC-04 form in the browser. Error values are dictionary keys (lib/i18n), never the typed value, so no
// message can repeat the password (BR-004). Role, status and consent version are never read from the form
// (BR-002, BR-003): the database trigger and the server set them.
import { isCountryCode } from './countries.js';

export const CREW_ROLES = Object.freeze(['producer', 'director', 'production_coordinator', 'line_producer', 'other']);
export const LOCALES = Object.freeze(['vi', 'en']);
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** Work email: trimmed, lower-cased, format, ≤ 254 (user_account.email). */
export function checkEmail(raw) {
  const email = str(raw).toLowerCase();
  if (!email) return { email, error: 'auth.error.email_required' };
  if (email.length > 254 || !EMAIL_RE.test(email)) return { email, error: 'auth.error.email_invalid' };
  return { email, error: null };
}

/** Password length only; strength and storage belong to Supabase Auth (SR-021). */
export function checkPassword(raw) {
  const password = typeof raw === 'string' ? raw : '';
  if (password.length < PASSWORD_MIN) return 'auth.error.password_short';
  if (password.length > PASSWORD_MAX) return 'auth.error.password_long';
  return null;
}

function checkWebsite(raw) {
  const website = str(raw);
  if (!website) return { website: '', error: null };
  if (website.length > 300) return { website, error: 'signup.error.website_invalid' };
  try {
    const url = new URL(website);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('protocol');
  } catch {
    return { website, error: 'signup.error.website_invalid' };
  }
  return { website, error: null };
}

/**
 * @returns {{ ok: boolean, errors: Record<string, string>, value: { full_name, email, password, org_name, country, crew_role, website, locale } }}
 */
export function validateSignUpInput(input) {
  const body = input && typeof input === 'object' ? input : {};
  const errors = {};

  const full_name = str(body.full_name);
  if (!full_name) errors.full_name = 'signup.error.full_name_required';
  else if (full_name.length > 120) errors.full_name = 'signup.error.full_name_long';

  const { email, error: emailError } = checkEmail(body.email);
  if (emailError) errors.email = emailError;

  const passwordError = checkPassword(body.password);
  if (passwordError) errors.password = passwordError;

  const org_name = str(body.org_name);
  if (!org_name) errors.org_name = 'signup.error.org_name_required';
  else if (org_name.length > 200) errors.org_name = 'signup.error.org_name_long';

  const country = str(body.country).toUpperCase();
  if (!isCountryCode(country)) errors.country = 'signup.error.country_invalid';

  const crew_role = str(body.crew_role);
  if (!CREW_ROLES.includes(crew_role)) errors.crew_role = 'signup.error.crew_role_invalid';

  const { website, error: websiteError } = checkWebsite(body.website);
  if (websiteError) errors.website = websiteError;

  if (body.terms_accepted !== true) errors.terms_accepted = 'signup.error.terms_required';

  const locale = LOCALES.includes(body.locale) ? body.locale : 'vi';

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { full_name, email, password: typeof body.password === 'string' ? body.password : '', org_name, country, crew_role, website, locale }
  };
}
