import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getSession } from '../../../lib/auth/session.js';
import { getI18n } from '../../../lib/i18n/server.js';
import { getProfile } from '../../../lib/db/partners.js';
import { getAllProvinces } from '../../../lib/db/locations.js';
import { isSlug } from '../../../lib/api/partners.js';
import { layerIndicator, requestAction, art13Badge, initials } from '../directory-view.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: `${t('partners.meta.title')} · CINEMATCH` };
}

const C = { navy: '#0f2d52', muted: '#6b7280', border: '#e5e7eb', green: '#166534', amber: '#92400e' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' };
const vnDate = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');

/** SC-20 Partner profile (/partners/[slug]), M4 FR-002..FR-004, BR-001: each block is a layer the database returned. */
export default async function PartnerProfilePage({ params }) {
  if (!isSlug(params.slug)) notFound();
  const session = await getSession({ headers: headers() });
  const signedIn = Boolean(session.isAuthenticated && session.userId);
  const { t, locale } = await getI18n();
  const profile = await getProfile(session, params.slug).catch((e) => (e?.code === 'NOT_FOUND' ? null : Promise.reject(e)));
  if (!profile) notFound();
  const provinces = Object.fromEntries((await getAllProvinces().catch(() => [])).map(p => [Number(p.province_id), p.name]));
  const p = profile.public;
  const action = requestAction(profile.my_request, signedIn, p.slug, { active: p.active });
  const badge = art13Badge(p);
  const capability = profile.member ? (locale === 'vi' ? profile.member.capability_desc_vi : profile.member.capability_desc_en) || profile.member.capability_desc_en || profile.member.capability_desc_vi : null;

  return (
    <main style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1rem' }}>
      <nav aria-label={t('partners.profile.breadcrumb')} style={{ fontSize: '0.875rem' }}>
        <a href="/partners" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('partners.profile.breadcrumb')}</a>
        {p.service_groups[0] ? <> › <a href={`/partners?group=${p.service_groups[0]}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{t(`partners.group.${p.service_groups[0]}`)}</a></> : null} › {p.org_name}
      </nav>

      <header style={{ ...box, display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <span aria-hidden="true" style={{ flex: '0 0 3.5rem', height: '3.5rem', borderRadius: '0.75rem', background: '#e8eef7', color: C.navy, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '1.25rem' }}>{initials(p.org_name)}</span>
        <div style={{ flex: 1, minWidth: '14rem' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0, overflowWrap: 'anywhere' }}>{p.org_name}</h1>
          <p style={{ margin: '0.25rem 0 0', color: C.muted }}>
            {p.founded_year ? t('partners.profile.legal', { legal_form: p.legal_form, year: p.founded_year, province: provinces[p.hq_province] || '—' })
              : t('partners.profile.legal_no_year', { legal_form: p.legal_form, province: provinces[p.hq_province] || '—' })}
          </p>
          {p.verified ? <p style={{ margin: '0.375rem 0 0', color: C.green, fontWeight: 600 }}>✓ {t('partners.verified', { month: String(p.verified_at).slice(0, 7) })} · {t('partners.profile.valid_until', { date: vnDate(p.verified_until) })}</p>
            : <p style={{ margin: '0.375rem 0 0', color: C.amber }}>{t('partners.not_verified')}</p>}
          {badge ? <p style={{ margin: '0.375rem 0 0' }}><strong>{t(badge.label)}</strong> <span style={{ color: C.muted, fontSize: '0.8125rem' }}>{t(badge.disclaimer)}</span></p> : null}
          {!p.active ? <p role="status" style={{ margin: '0.5rem 0 0', color: C.amber, fontWeight: 600 }}>{t('partners.profile.inactive')}</p> : null}
        </div>
        {action.kind !== 'none' ? (
          <a href={action.href} style={{ alignSelf: 'center', background: C.navy, color: '#fff', borderRadius: '0.5rem', padding: '0.55rem 1rem', textDecoration: 'none', fontWeight: 600 }}>
            {t(action.kind === 'view' ? 'partners.view_request' : 'partners.send_request')}
          </a>
        ) : null}
      </header>

      <ol aria-label={t('partners.layer.public')} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {layerIndicator(profile.layers).map(l => (
          <li key={l.layer} style={{ fontSize: '0.8125rem', padding: '0.25rem 0.625rem', borderRadius: '1rem', border: `1px solid ${l.open ? C.green : C.border}`, color: l.open ? C.green : C.muted }}>
            {t(`partners.layer.${l.layer}`)} — {t(l.open ? 'partners.layer.open' : 'partners.layer.closed')}
          </li>
        ))}
      </ol>

      <section style={box} aria-labelledby="services">
        <h2 id="services" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('partners.profile.services')}</h2>
        <p style={{ margin: 0 }}>{p.service_groups.map(g => t(`partners.group.${g}`)).join(' · ')}</p>
        <p style={{ margin: '0.375rem 0 0', color: C.muted, fontSize: '0.875rem' }}>{t('partners.provinces', { names: p.provinces.map(x => provinces[x] || x).join(', ') })}</p>
        {profile.member ? <p style={{ margin: '0.375rem 0 0', color: C.muted, fontSize: '0.875rem' }}>{t('partners.profile.languages', { list: profile.member.working_languages.map(l => l.toUpperCase()).join(', ') || '—' })}</p> : null}
      </section>

      {profile.member ? (
        <section style={box} aria-labelledby="capability">
          <h2 id="capability" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('partners.profile.capability')}</h2>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{capability || t('partners.profile.none')}</p>
          <p style={{ margin: '0.75rem 0 0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('partners.profile.portfolio')}</p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>{profile.member.portfolio.map((x, i) => <li key={i}>{x}</li>)}</ul>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: C.muted }}>{t('partners.profile.intl_count', { n: profile.member.intl_project_count })}</p>
        </section>
      ) : p.active ? <p style={{ ...box, color: C.muted }}>{t('partners.profile.signin_member')}</p> : null}

      {p.active ? (
        <section style={{ ...box, background: profile.private ? '#fff' : '#f9fafb' }} aria-labelledby="private">
          <h2 id="private" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>🔒 {t('partners.profile.private')}</h2>
          {profile.private ? (
            <>
              <p style={{ margin: '0 0 0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('partners.profile.rate_card')}</p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {(Array.isArray(profile.private.rate_card) ? profile.private.rate_card : Object.entries(profile.private.rate_card || {}).map(([item, amount]) => ({ item, amount, unit: '—' })))
                  .map((r, i) => <li key={i}>{t('partners.profile.rate_row', { item: r.item, amount: Number(r.amount).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB'), unit: r.unit })}</li>)}
              </ul>
              <p style={{ margin: '0.75rem 0 0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('partners.profile.past_clients')}</p>
              <p style={{ margin: 0 }}>{profile.private.past_clients.join(', ') || t('partners.profile.none')}</p>
              <p style={{ margin: '0.75rem 0 0.25rem', fontWeight: 600, fontSize: '0.875rem' }}>{t('partners.profile.direct_contact')}</p>
              <p style={{ margin: 0 }}>{profile.private.direct_contact || t('partners.profile.none')}</p>
            </>
          ) : <p style={{ margin: 0, color: C.muted }}>{t('partners.profile.private_locked')}</p>}
        </section>
      ) : null}

      <section style={box} aria-labelledby="checked">
        <h2 id="checked" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('partners.checked.title')}</h2>
        <p style={{ margin: 0 }}>{t('partners.checked.what')}</p>
        <p style={{ margin: '0.375rem 0 0' }}>{t('partners.checked.not')}</p>
        {p.checked ? (
          <>
            <p style={{ margin: '0.5rem 0 0.25rem', fontSize: '0.875rem' }}>{t('partners.checked.references')}</p>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>{p.checked.references.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </>
        ) : null}
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: C.muted }}>{t('partners.checked.draft')}</p>
      </section>
    </main>
  );
}
