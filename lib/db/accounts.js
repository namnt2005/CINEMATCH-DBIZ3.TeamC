// My account — SC-08 (FR-004, FR-005, BR-003, BR-005). Accounts exist only in Supabase Auth, so this module
// has no node:sqlite source: without Supabase the account routes answer 503 like the other auth routes.
import { userDb, systemDb, rows } from './supabase/util.js';
import { anonymisedEmail } from '../auth/account-input.js';

/** The signed-in user's own rows, read through Row Level Security. */
export async function getAccount(userId) {
  const db = await userDb();
  const account = rows(await db.from('user_account').select('email, email_verified, role, account_status').eq('user_id', userId).maybeSingle());
  if (!account) return null;
  const profile = rows(await db.from('profile').select('full_name, crew_role, locale, producer_org_id').eq('user_id', userId).maybeSingle());
  const organisation = profile?.producer_org_id
    ? rows(await db.from('producer_organisation').select('org_name, country, website').eq('producer_org_id', profile.producer_org_id).maybeSingle())
    : null;
  const consents = rows(await db.from('consent').select('consent_version, accepted_at').eq('user_id', userId).order('accepted_at', { ascending: false }));
  return {
    email: account.email,
    email_verified: Boolean(account.email_verified),
    role: account.role,
    full_name: profile?.full_name ?? '',
    crew_role: profile?.crew_role ?? null,
    locale: profile?.locale ?? null,
    organisation: organisation ? { org_name: organisation.org_name, country: organisation.country, website: organisation.website ?? null } : null,
    consents: consents.map(c => ({ consent_version: c.consent_version, accepted_at: c.accepted_at }))
  };
}

/**
 * Profile fields go through the user's own client (column grant: full_name, crew_role, locale).
 * The organisation has no user UPDATE policy, so the System client changes the user's own organisation
 * (found from the user's profile on the server, never from the request) or creates it when missing (SC-08 Empty).
 */
export async function updateAccount(userId, { profile, organisation }) {
  const db = await userDb();
  if (Object.keys(profile).length > 0) rows(await db.from('profile').update(profile).eq('user_id', userId));
  if (Object.keys(organisation).length > 0) {
    const system = await systemDb();
    const own = rows(await system.from('profile').select('producer_org_id').eq('user_id', userId).maybeSingle());
    if (own?.producer_org_id) {
      rows(await system.from('producer_organisation').update(organisation).eq('producer_org_id', own.producer_org_id));
    } else if (organisation.org_name && organisation.country) {
      const { randomUUID } = await import('node:crypto');
      const id = randomUUID();
      rows(await system.from('producer_organisation').insert({ producer_org_id: id, website: null, ...organisation }));
      rows(await system.from('profile').update({ producer_org_id: id }).eq('user_id', userId));
    }
  }
  return getAccount(userId);
}

/**
 * BR-005 *Delete my account*: deactivated at once by the user's own call (audited), every session ended,
 * then the System client anonymises the name and email in the database and in Supabase Auth, clears the
 * sign-up metadata and bans the identity. No row is deleted; what the account created stays (Former member).
 * There is no account phone field to anonymise (spec Open question 7).
 */
export async function deleteMyAccount(userId) {
  const db = await userDb();
  rows(await db.rpc('app_deactivate_my_account'));
  await db.auth.signOut({ scope: 'global' });
  const system = await systemDb();
  rows(await system.rpc('app_anonymise_deactivated'));
  const { error } = await system.auth.admin.updateUserById(userId, {
    email: anonymisedEmail(userId),
    email_confirm: true,
    user_metadata: {},
    ban_duration: '876000h'
  });
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
}
