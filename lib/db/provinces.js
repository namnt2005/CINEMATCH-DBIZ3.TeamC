// The 34 provincial-level units (`province`), for the SC-10 picker and the FR-001 check.
import { isSupabase } from './source.js';
import { query } from './client.js';

export async function listProvinces() {
  if (isSupabase()) {
    const { userDb, rows } = await import('./supabase/util.js');
    const db = await userDb();
    return rows(await db.from('province').select('province_id, name').order('province_id')).map(p => ({ province_id: Number(p.province_id), name: p.name }));
  }
  return query('SELECT province_id, name FROM province ORDER BY province_id').map(p => ({ province_id: Number(p.province_id), name: p.name }));
}
