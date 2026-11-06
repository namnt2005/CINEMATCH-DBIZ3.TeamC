// Error codes of the M4 data layer (specs/007-m4-partners contracts); the API maps them to HTTP statuses.
export const PARTNER_ERRORS = Object.freeze(['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'VALIDATION_ERROR', 'INVALID_STATE',
  'OPEN_REQUEST_EXISTS', 'ORG_DEACTIVATED', 'ARCHIVED', 'PENDING_EXISTS', 'NDA_REQUIRED', 'FILE_INVALID', 'FILE_MISSING',
  'INVITATION_OPEN', 'INVITATION_INVALID', 'EMAIL_MISMATCH', 'ALREADY_MEMBER_OF_PROJECT', 'ROLE_BY_INVITATION_ONLY']);

export class PartnerError extends Error {
  constructor(code, fields = null) {
    super(code);
    this.name = 'PartnerError';
    this.code = code;
    if (fields) this.fields = fields;
  }
}

/** The code of a PostgreSQL function error (RAISE EXCEPTION 'OPEN_REQUEST_EXISTS'), or null. */
export function partnerErrorCode(error) {
  if (error?.code === '42501') return 'FORBIDDEN';
  const text = String(error?.message || '').trim();
  return PARTNER_ERRORS.find(code => text === code || text.startsWith(`${code}:`)) ?? null;
}

/** Throws the PartnerError of a supabase-js RPC result, or returns its data. */
export function rpcData({ data, error }) {
  if (!error) return data;
  const code = partnerErrorCode(error);
  if (code) throw new PartnerError(code);
  throw Object.assign(new Error(error.message), { code: error.code, cause: error });
}
