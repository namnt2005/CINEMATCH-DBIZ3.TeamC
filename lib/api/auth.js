// Shared plumbing of the auth Route Handlers (specs/003-sys-core contracts/auth-and-account.contract.md).
// Passwords go straight to Supabase Auth: nothing here stores, hashes or logs them (BR-004, SR-021).
import { isSupabase } from '../db/source.js';
import { apiMessage } from '../i18n/index.js';

/** Error body { error, message } with the English text of the dictionary; screens translate from the code. */
export function authError(code, status, extra = {}) {
  return Response.json({ error: code, message: apiMessage(`auth.error.${code}`), ...extra }, { status });
}

/** Supabase Auth is the only identity provider: without it the auth routes answer 503. */
export function authUnavailable() {
  return isSupabase() ? null : authError('AUTH_UNAVAILABLE', 503);
}

export async function readJson(req) {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

/** Links in emails come back to the site that served the request. */
export const siteOrigin = (req) => new URL(req.url).origin;

export async function userClient() {
  const { getUserClient } = await import('../supabase/server.js');
  return getUserClient();
}

export async function systemClient() {
  const { getAdminClient } = await import('../supabase/admin.js');
  return getAdminClient();
}

/** role and account_status of an account (BR-005), or null. */
export async function accountStatus(db, column, value) {
  const { data } = await db.from('user_account').select('role, account_status').eq(column, value).maybeSingle();
  return data ?? null;
}
