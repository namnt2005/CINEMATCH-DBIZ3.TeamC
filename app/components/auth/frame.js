'use client';
// Page frame of the SYS auth screens: logged-out navigation bar with the EN | VI switch (SC-06 / SC-07 row 1)
// and the footer. Every text comes from lib/i18n.
import { useRouter } from 'next/navigation';
import { useLocale, useT, setLocale } from '../../../lib/i18n/client.js';
import { C, link } from './styles.js';

function LanguageSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const t = useT();
  const option = (value, text) => (
    <button
      type="button"
      onClick={() => value !== locale && setLocale(value, router)}
      aria-pressed={value === locale}
      lang={value}
      style={{ background: 'none', border: 'none', padding: '0 0.25rem', cursor: 'pointer', fontSize: '1rem', color: C.text, fontWeight: value === locale ? 700 : 400 }}
    >
      {text}
    </button>
  );
  return (
    <div role="group" aria-label={t('frame.language')} style={{ display: 'flex', alignItems: 'center' }}>
      {option('en', 'EN')}<span aria-hidden="true">|</span>{option('vi', 'VI')}
    </div>
  );
}

export default function AuthFrame({ children }) {
  const t = useT();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', color: C.text }}>
      <header style={{ borderBottom: '1px solid #e5e7eb' }}>
        <nav style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <a href="/locations" style={{ ...link, color: C.navy, fontWeight: 800, fontSize: '1.375rem', letterSpacing: '0.05em' }}>{t('frame.brand')}</a>
          <a href="/locations" style={{ ...link, color: C.text }}>{t('frame.nav.locations')}</a>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <LanguageSwitch />
            <a href="/login" style={{ ...link, color: C.text }}>{t('frame.nav.login')}</a>
            <a href="/signup" style={{ ...link, background: C.navy, color: '#fff', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600 }}>{t('frame.nav.signup')}</a>
          </div>
        </nav>
      </header>
      <main style={{ flex: 1, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1rem', boxSizing: 'border-box' }}>
        {children}
      </main>
      <footer style={{ borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.25rem 1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: C.muted, fontSize: '0.875rem' }}>
          <span>{t('frame.footer')}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: '1.5rem' }}>
            <a href="/privacy" style={{ ...link, color: C.muted }}>{t('frame.privacy')}</a>
            <a href="/terms" style={{ ...link, color: C.muted }}>{t('frame.terms')}</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
