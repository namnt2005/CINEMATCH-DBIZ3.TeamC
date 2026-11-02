// Public contacts API (async). node:sqlite or Supabase, chosen by lib/db/source.js (specs/003-sys-core D4).
import { isSupabase } from './source.js';
import * as sqlite from './sqlite/contacts.js';

const supabase = () => import('./supabase/contacts.js');

export { CONTACT_ROLES, canSeeAuthorityContact } from './contact-access.js';

export async function getAuthorityContact(...args) {
  return isSupabase() ? (await supabase()).getAuthorityContact(...args) : sqlite.getAuthorityContact(...args);
}
