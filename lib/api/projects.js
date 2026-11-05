// Shared plumbing of the M0 Route Handlers (specs/005-m0-workspace contracts/projects-api.contract.md).
// Error bodies { error, message, fields? } with the English text; screens translate from the code.
import { apiMessage } from '../i18n/index.js';
import { getSession } from '../auth/session.js';

const STATUS = {
  UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, METHOD_NOT_ALLOWED: 405, NAME_TAKEN: 409, NO_ORGANISATION: 409,
  ARCHIVED: 409, ALREADY_INVITED: 409, VALIDATION_ERROR: 422, INVALID_PERMISSION: 422, INVALID_STAGE: 422,
  READINESS_UNAVAILABLE: 503
};
const MESSAGE = {
  NAME_TAKEN: 'projects.error.name_taken', NO_ORGANISATION: 'projects.error.no_organisation', VALIDATION_ERROR: 'projects.api.validation',
  INVALID_PERMISSION: 'projects.api.validation', INVALID_STAGE: 'projects.api.validation', NOT_FOUND: 'projects.api.not_found',
  FORBIDDEN: 'projects.api.forbidden', ARCHIVED: 'projects.api.archived', ALREADY_INVITED: 'projects.api.already_invited',
  READINESS_UNAVAILABLE: 'projects.api.readiness_unavailable', METHOD_NOT_ALLOWED: 'projects.api.method_not_allowed',
  UNAUTHENTICATED: 'projects.api.unauthenticated'
};

export function projectError(code, extra = {}) {
  return Response.json({ error: code, message: apiMessage(MESSAGE[code] ?? 'projects.api.validation'), ...extra }, { status: STATUS[code] ?? 500 });
}

/** Maps a ProjectError of lib/db/projects.js to its response; anything else is rethrown (a 500). */
export function fromProjectError(err) {
  if (err?.name === 'ProjectError' && STATUS[err.code]) return projectError(err.code);
  throw err;
}

/** The signed-in session, or null for a guest (the caller answers 401). */
export async function memberSession(req) {
  const session = await getSession({ headers: req.headers });
  return session.isAuthenticated && session.userId ? session : null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A project or member id that cannot exist is a 404, not a database error (cinematch-dev, 05/11/2026). */
export const isUuid = (value) => UUID_RE.test(String(value || ''));

export async function readBody(req) {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}
