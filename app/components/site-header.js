'use client';
// Site header on every page (T055, US-3, US-4): brand and navigation, the VI | EN switch, and either
// Log in / Sign up or the account menu with the notification badge. Every text comes from lib/i18n.
import { useRouter, usePathname } from 'next/navigation';
import { useLocale, useSignedIn, useT, setLocale } from '../../lib/i18n/client.js';

const C = { navy: '#0f2d52', text: '#111827', muted: '#6b7280', red: '#b91c1c' };
const link = { color: C.text, textDecoration: 'none' };

export function LanguageSwitch() {
  const locale = useLocale();
  const signedIn = useSignedIn();
  const router = useRouter();
  const t = useT();
  const option = (value, text) => (
    <button
      type="button"
      lang={value}
      aria-pressed={value === locale}
      onClick={() => value !== locale && setLocale(value, router, { signedIn })}
      style={{ background: 'none', border: 'none', padding: '0 0.25rem', cursor: 'pointer', fontSize: '1rem', color: C.text, fontWeight: value === locale ? 700 : 400 }}
    >
      {text}
    </button>
  );
  return (
    <div role="group" aria-label={t('frame.language')} style={{ display: 'flex', alignItems: 'center' }}>
      {option('vi', 'VI')}<span aria-hidden="true">|</span>{option('en', 'EN')}
    </div>
  );
}

export default function SiteHeader({ state }) {
  const t = useT();
  const pathname = usePathname() || '/';
  const next = encodeURIComponent(pathname);
  async function logOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' }).catch(() => null);
    window.location.assign('/locations');
  }
  return (
    <header style={{ borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
      <nav aria-label={t('header.nav')} style={{ maxWidth: '1200px', margin: '0 auto', padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
        <a href="/locations" style={{ ...link, color: C.navy, fontWeight: 800, fontSize: '1.375rem', letterSpacing: '0.05em' }}>{t('frame.brand')}</a>
        <a href="/locations" style={link}>{t('frame.nav.locations')}</a>
        <a href="/locations/match" style={link}>{t('header.match')}</a>
        {state.signedIn ? <a href="/projects" style={link}>{t('header.projects')}</a> : null}
        {['vfda_staff', 'admin'].includes(state.role) ? <a href="/admin/locations" style={link}>{t('header.admin')}</a> : null}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <LanguageSwitch />
          {state.signedIn ? (
            <>
              <a href="/notifications" style={{ ...link, position: 'relative' }}
                aria-label={state.unread > 0 ? t('header.notifications_unread', { count: state.unread }) : t('header.notifications')}>
                {t('header.notifications')}
                {state.unread > 0 ? (
                  <span aria-hidden="true" style={{ marginLeft: '0.375rem', background: C.red, color: '#fff', borderRadius: '9999px', padding: '0 0.45rem', fontSize: '0.75rem', fontWeight: 700 }}>
                    {state.unread}
                  </span>
                ) : null}
              </a>
              <a href="/account" style={{ ...link, fontWeight: 600 }}>{state.name || t('header.account')}</a>
              <button type="button" onClick={logOut} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '1rem', padding: 0 }}>
                {t('header.logout')}
              </button>
            </>
          ) : (
            <>
              <a href={`/login?next=${next}`} style={link}>{t('frame.nav.login')}</a>
              <a href={`/signup?next=${next}`} style={{ ...link, background: C.navy, color: '#fff', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600 }}>{t('frame.nav.signup')}</a>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
