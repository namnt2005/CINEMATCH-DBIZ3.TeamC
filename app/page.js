import { getI18n } from '../lib/i18n/server.js';
import { LANDING } from './landing-content.js';

const C = { navy: '#0f2d52', text: '#111827', muted: '#6b7280', border: '#e5e7eb', panel: '#f9fafb' };
const card = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', background: '#fff', padding: '1rem 1.25rem' };
const soonBadge = { fontSize: '0.75rem', color: C.muted, border: `1px solid ${C.border}`, borderRadius: '9999px', padding: '0.05rem 0.5rem', marginLeft: '0.5rem' };

// Clarifications Q3: the site-wide description names the association; the landing page has its own
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('meta.title'), description: t('landing.meta.description') };
}

/**
 * SC-01 Landing (M1 FR-001), in the order of docs/screens/screen-spec-SC-01.md: headline and lead (#4–#5)
 * → the two buttons (#6–#7) → the four-uncertainties block (#8) → the 5-step journey (#10).
 * Not shown (plan D2, Clarifications Q3, SR-013): the legal-basis strip (#9) and the partnership line (#11).
 */
export default async function LandingPage({ searchParams }) {
  const { t } = await getI18n();
  const L = LANDING;
  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1rem' }}>
      {searchParams?.account_deleted ? (
        <p role="status" style={{ background: '#dcfce7', color: '#166534', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>{t('account.deleted')}</p>
      ) : null}

      <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <section style={{ flex: '1 1 26rem', minWidth: 0 }}>
          <p style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.8125rem', fontWeight: 600, color: C.muted, margin: '0 0 0.75rem' }}>{t(L.eyebrow)}</p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', lineHeight: 1.2, margin: '0 0 1rem', color: C.text }}>{t(L.headline)}</h1>
          <p style={{ color: '#374151', fontSize: '1.0625rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>{t(L.lead)}</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href={L.start.href} style={{ background: C.navy, color: '#fff', padding: '0.875rem 1.25rem', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: 600, flex: '1 1 14rem', textAlign: 'center' }}>
              {t(L.start.key)} →
            </a>
            <span aria-disabled="true" style={{ border: `1px solid ${C.border}`, color: C.muted, padding: '0.875rem 1.25rem', borderRadius: '0.5rem', flex: '1 1 14rem', textAlign: 'center' }}>
              {t(L.quickCheck.key)}<span style={soonBadge}>{t(L.soon)}</span>
            </span>
          </div>
        </section>

        <section aria-labelledby="uncertain-title" style={{ ...card, flex: '1 1 22rem', minWidth: 0, background: C.panel }}>
          <h2 id="uncertain-title" style={{ fontSize: '1.0625rem', margin: '0 0 0.75rem' }}>{t(L.uncertaintiesTitle)}</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.625rem' }}>
            {L.uncertainties.map(item => (
              <li key={item.key} style={card}>
                {item.href ? (
                  <a href={item.href} style={{ color: C.text, textDecoration: 'none', display: 'block' }}>
                    <div style={{ fontWeight: 600 }}>{t(item.key)}</div>
                    <div style={{ color: '#2563eb', fontSize: '0.875rem', marginTop: '0.25rem' }}>→ {t(item.hint)}</div>
                  </a>
                ) : (
                  <div aria-disabled="true">
                    <div style={{ fontWeight: 600, color: C.muted }}>{t(item.key)}<span style={soonBadge}>{t(L.soon)}</span></div>
                    <div style={{ color: C.muted, fontSize: '0.875rem', marginTop: '0.25rem' }}>{t(item.hint)}</div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="journey-title" style={{ marginTop: '3rem', borderTop: `1px solid ${C.border}`, paddingTop: '2rem' }}>
        <h2 id="journey-title" style={{ fontSize: '1.125rem', margin: '0 0 1rem' }}>{t(L.journeyTitle)}</h2>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '0.75rem' }}>
          {L.journey.map((step, i) => (
            <li key={step.title} style={card}>
              <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: '0.5rem' }}>{t(L.journeyStep, { n: i + 1 })}</div>
              <div style={{ fontWeight: 600 }}>{t(step.title)}</div>
              <div style={{ color: C.muted, fontSize: '0.875rem', marginTop: '0.25rem' }}>{t(step.text)}</div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
