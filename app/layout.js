import { getI18n } from '../lib/i18n/server.js';
import { I18nProvider } from '../lib/i18n/client.js';
import { headerState } from '../lib/auth/header-state.js';
import SiteHeader from './components/site-header.js';
import SiteFooter from './components/site-footer.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('meta.title'), description: t('meta.description') };
}

/**
 * Every page gets the language of the request (cookie, else the browser's language on the first visit,
 * else Vietnamese — FR-005) and the dictionary for its client components, plus the shared header and footer.
 */
export default async function RootLayout({ children }) {
  const { locale, messages } = await getI18n();
  const state = await headerState();
  return (
    <html lang={locale}>
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif', background: '#fff', color: '#111827' }}>
        <I18nProvider locale={locale} messages={messages} signedIn={state.signedIn}>
          <SiteHeader state={state} />
          {children}
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
