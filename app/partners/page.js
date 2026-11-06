import { headers } from 'next/headers';
import { getSession } from '../../lib/auth/session.js';
import { getI18n } from '../../lib/i18n/server.js';
import { listDirectory } from '../../lib/db/partners.js';
import { getAllProvinces } from '../../lib/db/locations.js';
import { validateDirectoryQuery } from '../../lib/partners/input.js';
import { filtersFromSearch, searchFromFilters, showLanguageFilter, memberLine, sendRequestHref, initials, showNotVerified } from './directory-view.js';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('partners.meta.title')} · CINEMATCH` };
}

const C = { navy: '#0f2d52', muted: '#6b7280', border: '#e5e7eb', green: '#166534', amber: '#92400e' };
const LANGUAGES = ['en', 'ko', 'ja', 'zh', 'fr', 'de'];
const field = { padding: '0.5rem 0.625rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', font: 'inherit', background: '#fff' };

/** SC-19 Partner directory (/partners), M4 FR-002, FR-005, FR-006: filters live in the URL; works without JavaScript. */
export default async function PartnersPage({ searchParams }) {
  const session = await getSession({ headers: headers() });
  const signedIn = Boolean(session.isAuthenticated && session.userId);
  const { t } = await getI18n();
  const raw = filtersFromSearch(new URLSearchParams(searchParams || {}));
  const checked = validateDirectoryQuery(raw);
  const filters = checked.ok ? checked.value : { q: '', group: null, province: null, language: null, verified_only: true };
  const [{ groups, organisations }, provinces] = await Promise.all([listDirectory(session, filters), getAllProvinces().catch(() => [])]);
  const provinceName = Object.fromEntries(provinces.map(p => [Number(p.province_id), p.name]));
  const linkFor = (patch) => `/partners${(s => (s ? `?${s}` : ''))(searchFromFilters({ ...raw, ...patch }))}`;

  return (
    <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.75rem', margin: 0 }}>{t('partners.title')}</h1>
      <p style={{ color: C.muted, margin: '0.25rem 0 1.25rem' }}>{t('partners.purpose')}</p>

      <form method="get" action="/partners" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <label style={{ flex: '1 1 16rem', fontSize: '0.875rem' }}>{t('partners.search')}
          <input name="q" defaultValue={raw.q} maxLength={80} style={{ ...field, display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.25rem' }} />
        </label>
        {raw.group ? <input type="hidden" name="group" value={raw.group} /> : null}
        <label style={{ fontSize: '0.875rem' }}>{t('partners.filter.province')}
          <select name="province" defaultValue={raw.province} style={{ ...field, display: 'block', marginTop: '0.25rem' }}>
            <option value="">{t('partners.filter.any_province')}</option>
            {provinces.map(p => <option key={p.province_id} value={p.province_id}>{p.name}</option>)}
          </select>
        </label>
        {showLanguageFilter(signedIn) ? (
          <label style={{ fontSize: '0.875rem' }}>{t('partners.filter.language')}
            <select name="language" defaultValue={raw.language} style={{ ...field, display: 'block', marginTop: '0.25rem' }}>
              <option value="">{t('partners.filter.any_language')}</option>
              {LANGUAGES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
          </label>
        ) : <p style={{ fontSize: '0.8125rem', color: C.muted, margin: 0 }}>{t('partners.filter.signin_for_language')}</p>}
        <label style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <input type="checkbox" name="verified_only" value="true" defaultChecked={raw.verified_only} />
          <input type="hidden" name="verified_only" value="false" />
          {t('partners.filter.verified_only')}
        </label>
        <button type="submit" style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.55rem 1rem', font: 'inherit', fontWeight: 600 }}>{t('partners.filter.apply')}</button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 15rem), 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        <nav aria-label={t('partners.filter.groups')} style={{ border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '0.75rem', background: '#fff' }}>
          <h2 style={{ fontSize: '0.9375rem', margin: '0 0 0.5rem' }}>{t('partners.filter.groups')}</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.25rem' }}>
            <li><a href={linkFor({ group: '' })} aria-current={!raw.group ? 'true' : undefined} style={{ color: !raw.group ? C.navy : '#2563eb', fontWeight: !raw.group ? 700 : 400, textDecoration: 'none' }}>{t('partners.filter.all_groups')}</a></li>
            {groups.map(g => (
              <li key={g.value}>
                <a href={linkFor({ group: g.value })} aria-current={raw.group === g.value ? 'true' : undefined}
                  style={{ color: raw.group === g.value ? C.navy : '#2563eb', fontWeight: raw.group === g.value ? 700 : 400, textDecoration: 'none' }}>
                  {t(`partners.group.${g.value}`)} ({g.count})
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-live="polite" style={{ gridColumn: 'span 2', minWidth: 0 }}>
          <p style={{ color: C.muted, margin: '0 0 0.75rem' }}>{t('partners.count', { n: organisations.length })}</p>
          {organisations.length === 0 ? <p style={{ border: `1px dashed ${C.border}`, borderRadius: '0.75rem', padding: '1.5rem', color: C.muted }}>{t('partners.empty')}</p> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.875rem' }}>
              {organisations.map(o => {
                const line = memberLine(o);
                return (
                  <li key={o.slug} style={{ border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff', display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                    <span aria-hidden="true" style={{ flex: '0 0 2.75rem', height: '2.75rem', borderRadius: '0.5rem', background: '#e8eef7', color: C.navy, display: 'grid', placeItems: 'center', fontWeight: 700 }}>{initials(o.org_name)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={`/partners/${o.slug}`} style={{ color: '#111827', fontWeight: 700, textDecoration: 'none', overflowWrap: 'anywhere' }}>{o.org_name}</a>
                      <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                        {o.verified ? <span style={{ color: C.green, fontWeight: 600 }}>✓ {t('partners.verified', { month: o.verified_month })}</span> : null}
                        {showNotVerified(o, raw.verified_only) ? <span style={{ color: C.amber }}>{t('partners.not_verified')}</span> : null}
                      </div>
                      <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem' }}>{o.service_groups.map(g => t(`partners.group.${g}`)).join(' · ')}</p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: C.muted }}>{t('partners.provinces', { names: o.provinces.map(p => provinceName[p] || p).join(', ') })}</p>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: C.muted }}>
                        {line ? t('partners.member_line', { count: line.count, languages: line.languages.join(', ') }) : t('partners.member_line_signin')}
                      </p>
                    </div>
                    <a href={sendRequestHref(o.slug, signedIn)} style={{ flex: '0 0 auto', alignSelf: 'center', background: C.navy, color: '#fff', borderRadius: '0.5rem', padding: '0.45rem 0.8rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>{t('partners.send_request')}</a>
                  </li>
                );
              })}
            </ul>
          )}
          <aside style={{ marginTop: '1.5rem', background: '#f5f8fc', borderRadius: '0.75rem', padding: '1rem' }}>
            <h2 style={{ fontSize: '0.9375rem', margin: '0 0 0.375rem' }}>{t('partners.explainer.title')}</h2>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>{t('partners.explainer.text')}</p>
            <p style={{ margin: '0.375rem 0 0', fontSize: '0.75rem', color: C.muted }}>{t('partners.checked.draft')}</p>
          </aside>
        </section>
      </div>
    </main>
  );
}
