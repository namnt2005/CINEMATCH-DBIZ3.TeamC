import { headers } from 'next/headers';
import { getSession } from '../../../../lib/auth/session.js';
import { getI18n } from '../../../../lib/i18n/server.js';
import { getInvitation } from '../../../../lib/db/partner-invitations.js';
import AcceptButton from './accept-button.js';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('invitations.accept.meta')} · CINEMATCH` };
}

const C = { muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c' };

/** Accept a partner invitation (/invitations/partner/:code), M4 BR-003: sign in with the invited address, then accept. */
export default async function AcceptInvitationPage({ params }) {
  const session = await getSession({ headers: headers() });
  const { t } = await getI18n();
  const invitation = await getInvitation(params.code).catch(() => null);
  const next = encodeURIComponent(`/invitations/partner/${params.code}`);
  const signedIn = session.isAuthenticated && session.userId;
  return (
    <main style={{ maxWidth: '640px', margin: '3rem auto', padding: '0 1rem', display: 'grid', gap: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{t('invitations.accept.title')}</h1>
      {!invitation ? <p role="alert" style={{ color: C.red, margin: 0 }}>{t('invitations.accept.unknown')}</p> : (
        <section style={{ border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', display: 'grid', gap: '0.75rem', background: '#fff' }}>
          <p style={{ margin: 0 }}>{t('invitations.accept.text', { organisation: invitation.org_name })}</p>
          <p style={{ margin: 0, color: C.muted }}>{t('invitations.accept.for', { email: invitation.email_hint })}</p>
          {invitation.state !== 'open' ? <p role="alert" style={{ color: C.red, margin: 0 }}>{t(`invitations.accept.${invitation.state}`)}</p>
            : signedIn ? <AcceptButton code={params.code} />
              : (
                <p style={{ margin: 0 }}>
                  <a href={`/login?next=${next}`} style={{ color: '#2563eb' }}>{t('invitations.accept.login')}</a>
                  {' · '}<a href={`/signup?next=${next}`} style={{ color: '#2563eb' }}>{t('invitations.accept.register')}</a>
                </p>
              )}
        </section>
      )}
    </main>
  );
}
