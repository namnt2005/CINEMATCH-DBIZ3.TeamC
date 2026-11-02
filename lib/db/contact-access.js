// Who may see local authority contacts — same rule on both data sources.

// Roles that may see local authority contacts (BR-005; SYS Clarifications Q1: any signed-in member, no company check)
export const CONTACT_ROLES = ['member', 'partner', 'vfda_staff', 'vfda_legal', 'admin'];

export function canSeeAuthorityContact(session) {
  return Boolean(session?.isAuthenticated) && CONTACT_ROLES.includes(session.role);
}

/**
 * The database refused the read (Supabase: no GRANT for the caller, SQLSTATE 42501). Callers show
 * "no access" instead of failing, e.g. when the session expired between the role check and the query.
 */
export class ContactAccessDenied extends Error {
  constructor() {
    super('You do not have access to local authority contacts.');
    this.name = 'ContactAccessDenied';
    this.code = 'FORBIDDEN';
    this.status = 403;
  }
}

export const isContactAccessDenied = (err) => err instanceof ContactAccessDenied;

