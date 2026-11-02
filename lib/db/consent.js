// Terms consent (BR-003): the current version and the versions an account accepted (SC-08 #12, SC-42 #9,
// SC-43 #8), node:sqlite or Supabase. Acceptance is stored at sign-up by the database trigger (research R5).
import { isSupabase } from './source.js';
import { query } from './client.js';

// Interim: the newest version in data/seed (account `park` re-consented to it, data/seed/README.md).
// SC-43 row 3 shows this value; VFDA Legal to confirm it (research Open question 10, spec questions 11–12).
export const CURRENT_CONSENT_VERSION = '2026.2';

export function currentConsentVersion() {
  return CURRENT_CONSENT_VERSION;
}

/** Accepted versions of an account with their time, newest first (SR-235, read-only). */
export async function getConsents(userId) {
  if (!userId) return [];
  if (isSupabase()) {
    const { userDb, rows } = await import('./supabase/util.js');
    const db = await userDb();
    return rows(await db.from('consent').select('consent_version, accepted_at').eq('user_id', userId).order('accepted_at', { ascending: false }));
  }
  return query('SELECT consent_version, accepted_at FROM consent WHERE user_id = ? ORDER BY accepted_at DESC', [userId])
    .map(r => ({ consent_version: r.consent_version, accepted_at: r.accepted_at }));
}
