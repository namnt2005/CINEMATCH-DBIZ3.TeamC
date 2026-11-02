import { getI18n } from '../../lib/i18n/server.js';
import { I18nProvider } from '../../lib/i18n/client.js';
import { isSupabase } from '../../lib/db/source.js';
import ResetForm from './reset-form.js';

/**
 * SC-07 Reset password (/reset-password). The middleware has already exchanged the code of the email link
 * for a recovery session; without that session (expired, used, or another browser) the expired-link panel
 * shows instead of the form (SR-221).
 */
export default async function ResetPasswordPage({ searchParams }) {
  const { locale, messages } = await getI18n();
  let email = null;
  if (isSupabase() && searchParams?.error !== 'link_expired') {
    const { getUserClient } = await import('../../lib/supabase/server.js');
    const { data } = await (await getUserClient()).auth.getUser();
    email = data?.user?.email ?? null;
  }
  return (
    <I18nProvider locale={locale} messages={messages}>
      <ResetForm email={email} expired={!email} />
    </I18nProvider>
  );
}
