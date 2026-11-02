// SC-42 Privacy policy and SC-43 Terms of use, in the order of their screen specs: title and draft banner (#2)
// → version and date (#3) → language switch (#4) → table of contents (#5) → sections (#6–#8) → the reader's
// consent record (SC-42 #9, SC-43 #8). The text of the version comes from lib/legal/documents.js (BR-003).
import { getI18n } from '../../../lib/i18n/server.js';
import { formatDate, formatTime } from '../../../lib/i18n/format.js';
import { getDocument } from '../../../lib/legal/documents.js';
import { getConsents } from '../../../lib/db/consent.js';
import { getSession } from '../../../lib/auth/session.js';
import LanguageChips from './language-chips.js';

const LINKS = { account: '/account', signup: '/signup', privacy: '/privacy', terms: '/terms' };

function Body({ text, t }) {
  return text.split(/(\[\[\w+\]\])/).map((part, i) => {
    const m = /^\[\[(\w+)\]\]$/.exec(part);
    return m ? <a key={i} href={LINKS[m[1]]} style={{ color: '#2563eb', textDecoration: 'none' }}>{t(`legal.link.${m[1]}`)}</a> : part;
  });
}

function ConsentRecord({ consents, current, kind, t }) {
  if (consents === null) {
    return <p style={{ margin: 0 }}>{t('legal.record.guest')} <a href="/signup" style={{ color: '#2563eb' }}>{t('legal.link.signup')}</a>.</p>;
  }
  const latest = consents[0];
  if (!latest) return <p style={{ margin: 0 }}>{t('legal.record.none')}</p>;
  const when = { version: latest.consent_version, date: formatDate(latest.accepted_at), time: formatTime(latest.accepted_at) };
  if (latest.consent_version !== current) {
    return (
      <p style={{ margin: 0 }}>
        {t('legal.record.earlier', when)}{' '}
        <a href={`/${kind}?version=${encodeURIComponent(latest.consent_version)}`} style={{ color: '#2563eb' }}>{t('legal.record.open_earlier')}</a>
      </p>
    );
  }
  return <p style={{ margin: 0 }}>{t('legal.record.accepted', when)}</p>;
}

export default async function LegalPage({ kind, version }) {
  const { t, locale } = await getI18n();
  const doc = getDocument(kind, version);
  const sections = doc.sections[locale] || doc.sections.en;
  const { headers } = await import('next/headers.js');
  const session = await getSession({ headers: headers() });
  const consents = session.isAuthenticated && session.userId ? await getConsents(session.userId).catch(() => []) : null;
  const recordSection = kind === 'privacy' ? 'consent' : 'acceptance';

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 28rem' }}>
          <h1 style={{ fontSize: '2rem', margin: '0 0 1rem' }}>{doc.title[locale] || doc.title.en}</h1>
          {doc.draft ? (
            <p role="note" style={{ background: '#fdf3dc', border: '1px solid #f0d9a8', color: '#7c4a03', borderRadius: '0.5rem', padding: '0.75rem 1rem', margin: 0 }}>
              <strong>{t('legal.draft.title')}</strong> — {t('legal.draft.text')}
            </p>
          ) : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', fontSize: '0.875rem', color: '#4b5563' }}>
          <LanguageChips />
          <div>{t('legal.version', { version: doc.version })}</div>
          <div>{t('legal.effective')}</div>
        </div>
      </div>

      {doc.requestedMissing ? (
        <p role="alert" style={{ background: '#fde8e8', color: '#b91c1c', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginTop: '1rem' }}>{t('legal.missing_version')}</p>
      ) : null}

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: '1.5rem' }}>
        <nav aria-label={t('legal.toc')} style={{ flex: '0 1 18rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem 1.25rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{t('legal.toc')}</div>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 2 }}>
            {sections.map(s => <li key={s.id}><a href={`#${s.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{s.heading}</a></li>)}
          </ol>
        </nav>
        <div style={{ flex: '1 1 30rem', minWidth: 0 }}>
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} style={s.id === recordSection ? { border: '2px solid #0f2d52', borderRadius: '0.5rem', padding: '1rem 1.25rem', marginBottom: '1.25rem' } : { marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', margin: '0 0 0.5rem' }}>{i + 1}. {s.heading}</h2>
              <p style={{ margin: 0, lineHeight: 1.6 }}><Body text={s.body} t={t} /></p>
              {s.id === recordSection ? (
                <div style={{ background: '#f3f6fb', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginTop: '0.75rem' }}>
                  <ConsentRecord consents={consents} current={doc.version} kind={kind} t={t} />
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
