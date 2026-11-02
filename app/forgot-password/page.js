import { getI18n } from '../../lib/i18n/server.js';
import { I18nProvider } from '../../lib/i18n/client.js';
import ForgotForm from './forgot-form.js';

/** SC-06 Forgot password (/forgot-password). ?email= pre-fills the field (SC-07 *Send a new link*). */
export default async function ForgotPasswordPage({ searchParams }) {
  const { locale, messages } = await getI18n();
  return (
    <I18nProvider locale={locale} messages={messages}>
      <ForgotForm initialEmail={typeof searchParams?.email === 'string' ? searchParams.email : ''} />
    </I18nProvider>
  );
}
