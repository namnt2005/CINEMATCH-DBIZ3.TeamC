// Display name of an account (profile.full_name), from the active data source.
import { isSupabase } from './source.js';
import { getOne } from './client.js';

export async function getProfileName(userId) {
  if (!userId) return null;
  if (isSupabase()) {
    const { getAdminClient } = await import('../supabase/admin.js');
    const { data } = await getAdminClient().from('profile').select('full_name').eq('user_id', userId).maybeSingle();
    return data?.full_name ?? null;
  }
  return getOne('SELECT full_name FROM profile WHERE user_id = ?', [userId])?.full_name ?? null;
}
