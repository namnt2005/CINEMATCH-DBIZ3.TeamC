// Who may see local authority contacts — same rule on both data sources.

// Roles that may see local authority contacts (BR-005; SYS Clarifications Q1: any signed-in member, no company check)
export const CONTACT_ROLES = ['member', 'partner', 'vfda_staff', 'vfda_legal', 'admin'];

export function canSeeAuthorityContact(session) {
  return Boolean(session?.isAuthenticated) && CONTACT_ROLES.includes(session.role);
}

