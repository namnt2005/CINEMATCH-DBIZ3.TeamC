import { userDb } from './util.js';
import { rpcData } from '../../partners/errors.js';

// Supabase source: app_log_document_view checks the viewer and writes the row as the signed-in user.
export async function logDocumentView(session, documentId) {
  const db = await userDb();
  return rpcData(await db.rpc('app_log_document_view', { p_document_id: documentId }));
}
