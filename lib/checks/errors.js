// Error codes of the M2 data layer (specs/008-m2-check contracts); the API maps them to HTTP statuses (lib/api/checks.js).
export const CHECK_ERRORS = Object.freeze(['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'VALIDATION_ERROR', 'ARCHIVED', 'RULE_SET_CHANGED',
  'RATE_LIMITED', 'CHECK_UNAVAILABLE', 'CITATION_REQUIRED', 'CODE_EXISTS', 'NOT_DRAFT', 'DRAFT_EXISTS', 'NOT_APPROVED']);

export class CheckError extends Error {
  constructor(code, fields = null) {
    super(code);
    this.name = 'CheckError';
    this.code = code;
    if (fields) this.fields = fields;
  }
}

/** The code of a PostgreSQL function error (RAISE EXCEPTION 'ARCHIVED'), or null. */
export function checkErrorCode(error) {
  if (error?.code === '42501') return 'FORBIDDEN';
  if (error?.code === '23514' && /ck_legal_rule_approved_needs_signature/.test(`${error.message} ${error.details ?? ''}`)) return 'CITATION_REQUIRED';
  const text = String(error?.message || '').trim();
  return CHECK_ERRORS.find(code => text === code || text.startsWith(`${code}:`)) ?? null;
}

/** Throws the CheckError of a supabase-js result, or returns its data. */
export function rpcResult({ data, error }) {
  if (!error) return data;
  const code = checkErrorCode(error);
  if (code) throw new CheckError(code, code === 'CITATION_REQUIRED' ? { citation: 'rules.error.citation' } : null);
  throw Object.assign(new Error(error.message), { code: error.code, cause: error });
}
