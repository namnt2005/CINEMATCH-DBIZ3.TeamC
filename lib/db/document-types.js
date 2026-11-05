// The Article 13 document types (A13_*) whose names the dossier next step shows (M0 US-2 Scenario 1).
import { isSupabase } from './source.js';
import { query } from './client.js';

export async function listArticle13Types() {
  if (isSupabase()) {
    const { userDb, rows } = await import('./supabase/util.js');
    const db = await userDb();
    return rows(await db.from('document_type').select('doc_code, name_vi, name_en').order('doc_code')).filter(d => d.doc_code.startsWith('A13_'));
  }
  return query("SELECT doc_code, name_vi, name_en FROM document_type WHERE SUBSTR(doc_code, 1, 4) = 'A13_' ORDER BY doc_code");
}
