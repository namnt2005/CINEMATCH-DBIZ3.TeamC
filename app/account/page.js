import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSession } from '../../lib/auth/session.js';
import { isSupabase } from '../../lib/db/source.js';
import { getI18n } from '../../lib/i18n/server.js';
import AccountForm from './account-form.js';

export const dynamic = 'force-dynamic';

/** SC-08 My account (/account): signed-in users only; accounts live in Supabase Auth (FR-004, FR-005, BR-005). */
export default async function AccountPage() {
  if (!isSupabase()) {
    const { t } = await getI18n();
    return <main style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1rem' }}><p>{t('auth.error.AUTH_UNAVAILABLE')}</p></main>;
  }
  const session = await getSession({ headers: headers() });
  if (!session.isAuthenticated || !session.userId) redirect('/login?next=%2Faccount');
  const { getAccount } = await import('../../lib/db/accounts.js');
  const account = await getAccount(session.userId);
  if (!account) redirect('/login?next=%2Faccount');
  return <AccountForm account={account} />;
}
