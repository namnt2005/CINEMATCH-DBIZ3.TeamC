import { getI18n } from '../../lib/i18n/server.js';
import { I18nProvider } from '../../lib/i18n/client.js';
import AuthScreen from '../components/auth/auth-screen.js';

/** SC-05 Log in (/login): same layout as SC-04, Log in tab. ?error=link_expired comes from /auth/callback. */
export default async function LogInPage({ searchParams }) {
  const { locale, messages } = await getI18n();
  return (
    <I18nProvider locale={locale} messages={messages}>
      <AuthScreen
        tab="login"
        next={typeof searchParams?.next === 'string' ? searchParams.next : ''}
        linkExpired={searchParams?.error === 'link_expired'}
      />
    </I18nProvider>
  );
}
