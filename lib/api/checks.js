// Shared plumbing of the M2 Route Handlers (specs/008-m2-check contracts). Error bodies { error, message, fields? } with
// the English text of a dictionary key; screens translate from the code and the field keys.
import { apiMessage } from '../i18n/index.js';

const STATUS = {
  UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION_ERROR: 422, CITATION_REQUIRED: 422,
  ARCHIVED: 409, RULE_SET_CHANGED: 409, CODE_EXISTS: 409, NOT_DRAFT: 409, DRAFT_EXISTS: 409, NOT_APPROVED: 409,
  RATE_LIMITED: 429, CHECK_UNAVAILABLE: 503,
  NOT_IN_KIT: 422, FILE_TYPE: 422, FILE_TOO_LARGE: 422, LIMIT: 422, EMPTY_PARAGRAPH: 422, UPLOAD_MISSING: 409, TRANSLATION_UNAVAILABLE: 409
};

export function checkError(code, extra = {}) {
  return Response.json({ error: code, message: apiMessage(`checks.api.${code.toLowerCase()}`), ...extra }, { status: STATUS[code] ?? 500 });
}

/** Maps a CheckError (or a ProjectError of the shared helpers) to its response; anything else is rethrown (a 500). */
export function fromCheckError(err) {
  if ((err?.name === 'CheckError' || err?.name === 'ProjectError') && STATUS[err.code]) {
    return checkError(err.code, err.fields ? { fields: err.fields } : {});
  }
  throw err;
}

/** First address of x-forwarded-for (set by the hosting platform; Known limitation 7), or 'local'. */
export const clientIp = (req) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
/** Two-letter country from the platform header, or null; never the IP (research R14). */
export const countryOf = (req) => { const c = (req.headers.get('x-vercel-ip-country') || '').toUpperCase(); return /^[A-Z]{2}$/.test(c) ? c : null; };
