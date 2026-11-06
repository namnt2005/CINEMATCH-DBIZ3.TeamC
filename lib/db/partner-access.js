// Whether the caller acts for an organisation (M4 D1), on either data source (003 D4).
import { isSupabase } from './source.js';
import { isOrgUser } from './sqlite/partner-access.js';

export async function actsFor(session, orgId) {
  if (!session?.isAuthenticated || !session.userId || session.role !== 'partner') return false;
  if (!isSupabase()) return isOrgUser(session, orgId);
  const { userDb, rows } = await import('./supabase/util.js');
  const db = await userDb();
  return Boolean(rows(await db.from('organisation_user').select('org_id').eq('org_id', orgId).eq('user_id', session.userId).maybeSingle()));
}

export const isStaffRole = (session) => Boolean(session?.isAuthenticated && session.userId) && ['vfda_staff', 'admin'].includes(session.role);
