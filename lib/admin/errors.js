/**
 * Errors of the SC-35 admin actions (specs/002-m3-publish/contracts/admin-locations.contract.md).
 * The data layer throws them; lib/api/admin.js turns them into HTTP responses.
 */
export class AdminError extends Error {
  constructor(code, status, message, extra = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

export class ValidationError extends AdminError {
  constructor(fields) {
    super('VALIDATION_ERROR', 422, 'Some fields are not valid.', { fields });
  }
}

export const BLOCKED_REASON = 'Authority contact not verified (M3 BR-004).';

export const notFound = () => new AdminError('NOT_FOUND', 404, 'Location not found.');
