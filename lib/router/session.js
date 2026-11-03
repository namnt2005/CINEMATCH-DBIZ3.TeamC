// Anonymous router session (specs/004-m1-router D3, research R6): a random key in an http-only cookie,
// stored as segment_decision.session_key = "session:<key>". Never linked to an account or a person.
import { randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'cm_router_session';
const MAX_AGE = 30 * 24 * 3600;

function cookieValue(header, name) {
  for (const part of String(header || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

/** The session of a request, or null; only short [A-Za-z0-9_-] values are accepted (VARCHAR(40) with the prefix). */
export function readSession(req) {
  const value = cookieValue(req.headers.get('cookie'), SESSION_COOKIE);
  return value && /^[A-Za-z0-9_-]{1,32}$/.test(value) ? value : null;
}

export const newSession = () => randomBytes(8).toString('hex');
export const sessionKey = (value) => `session:${value}`;

export function sessionCookie(value) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; SameSite=Lax${secure}`;
}

/** Language of the request for the requirement labels (cookie, else browser, else Vietnamese — SYS FR-005). */
export async function requestLocale(req) {
  const { pickLocale, LOCALE_COOKIE } = await import('../i18n/index.js');
  return pickLocale(cookieValue(req.headers.get('cookie'), LOCALE_COOKIE), req.headers.get('accept-language'));
}
