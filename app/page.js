import { getI18n } from '../lib/i18n/server.js';

export default async function HomePage({ searchParams }) {
  const { t } = await getI18n();
  const card = { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', background: '#f9fafb' };
  const button = (bg) => ({ display: 'inline-block', padding: '0.5rem 1rem', background: bg, color: '#fff', borderRadius: '4px', textDecoration: 'none', fontWeight: 500 });
  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      {searchParams?.account_deleted ? (
        <p role="status" style={{ background: '#dcfce7', color: '#166534', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>{t('account.deleted')}</p>
      ) : null}
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{t('home.title')}</h1>
        <p style={{ color: '#4b5563' }}>{t('home.lead')}</p>
      </header>
      <section style={{ display: 'grid', gap: '1rem' }}>
        <div style={card}>
          <h2 style={{ fontSize: '1.25rem', marginTop: 0 }}>{t('home.search.title')}</h2>
          <p style={{ color: '#4b5563' }}>{t('home.search.text')}</p>
          <a href="/locations" style={button('#2563eb')}>{t('home.search.open')}</a>
        </div>
        <div style={card}>
          <h2 style={{ fontSize: '1.25rem', marginTop: 0 }}>{t('home.match.title')}</h2>
          <p style={{ color: '#4b5563' }}>{t('home.match.text')}</p>
          <a href="/locations/match" style={button('#059669')}>{t('home.match.open')}</a>
        </div>
      </section>
    </main>
  );
}
