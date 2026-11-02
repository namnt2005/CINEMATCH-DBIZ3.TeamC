import { getI18n } from '../../lib/i18n/server.js';
import { I18nProvider } from '../../lib/i18n/client.js';
import AuthScreen from '../components/auth/auth-screen.js';

/** SC-04 Sign up (/signup): the Create account tab. `next` is the page that led here (SR-025). */
export default async function SignUpPage({ searchParams }) {
  const { locale, messages } = await getI18n();
  return (
    <I18nProvider locale={locale} messages={messages}>
      <AuthScreen tab="signup" next={typeof searchParams?.next === 'string' ? searchParams.next : ''} />
    </I18nProvider>
  );
}
