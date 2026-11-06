// Shared plumbing of the M4 Route Handlers (specs/007-m4-partners contracts). Error bodies { error, message, fields? }
// with the English text of a dictionary key; screens translate from the code and the field keys.
import { apiMessage } from '../i18n/index.js';

const STATUS = {
  UNAUTHENTICATED: 401, FORBIDDEN: 403, EMAIL_MISMATCH: 403, NOT_FOUND: 404, FILE_MISSING: 404,
  INVALID_STATE: 409, OPEN_REQUEST_EXISTS: 409, ORG_DEACTIVATED: 409, ARCHIVED: 409, PENDING_EXISTS: 409,
  INVITATION_OPEN: 409, ALREADY_MEMBER_OF_PROJECT: 409, INVITATION_INVALID: 410,
  VALIDATION_ERROR: 422, NDA_REQUIRED: 422, FILE_INVALID: 422, ROLE_BY_INVITATION_ONLY: 422
};

export function partnerError(code, extra = {}) {
  const key = `partners.api.${code.toLowerCase()}`;
  return Response.json({ error: code, message: apiMessage(key), ...extra }, { status: STATUS[code] ?? 500 });
}

/** Maps a PartnerError (or a ProjectError of the shared helpers) to its response; anything else is rethrown (a 500). */
export function fromPartnerError(err) {
  if ((err?.name === 'PartnerError' || err?.name === 'ProjectError') && STATUS[err.code]) {
    return partnerError(err.code, err.fields ? { fields: err.fields } : {});
  }
  throw err;
}

export const isUuidLike = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const isSlug = (v) => typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,159}$/.test(v);
