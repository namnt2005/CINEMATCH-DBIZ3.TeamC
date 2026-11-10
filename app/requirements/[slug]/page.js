import { getI18n } from '../../../lib/i18n/server.js';
import { getSession } from '../../../lib/auth/session.js';
import { headers } from 'next/headers';
import { getRequirement } from '../../../lib/db/requirements.js';
import { severityKey, topicKey, filterHref } from '../../../lib/requirements/view.js';
import { vnDate } from '../../../lib/licensing/view.js';

const C = { navy: '#0f2d52', blue: '#2563eb', muted: '#6b7280', border: '#e5e7eb', amber: '#92400e', grey: '#f3f4f6' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' };
const action = { display: 'block', border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '0.75rem 1rem', color: C.navy, fontWeight: 600, textDecoration: 'none', background: '#fff' };

async function load(slug) {
  if (!/^[a-z0-9-]{1,120}$/.test(slug || '')) return { missing: true };
  try { return await getRequirement(slug); } catch (err) { return err?.code === 'NOT_FOUND' ? { missing: true } : { failed: true }; }
}

export async function generateMetadata({ params }) {
  const { t, locale } = await getI18n();
  const out = await load(params.slug);
  const title = out.rule ? (locale === 'vi' ? out.rule.title_vi : out.rule.title_en) : t('requirements.meta.title');
  return { title: `${title} · CINEMATCH` };
}

/** SC-31 Requirement detail (/requirements/[slug]), M2 FR-016: both languages and the citation; retired rules marked (SR-293). */
export default async function RequirementPage({ params }) {
  const { t, locale } = await getI18n();
  const out = await load(params.slug);
  if (!out.rule) {
    return (
      <main style={{ maxWidth: '720px', margin: '3rem auto', padding: '0 1rem' }}>
        <p role={out.failed ? 'alert' : undefined}>{t(out.failed ? 'requirements.error.load' : 'requirements.detail.not_found')}</p>
        <a href="/requirements" style={{ color: C.blue }}>{t('requirements.detail.back')}</a>
      </main>
    );
  }
  const r = out.rule;
  const session = await getSession({ headers: headers() }).catch(() => null);
  const consult = session?.isAuthenticated ? '/consult' : '/login?next=%2Fconsult';
  const langs = locale === 'vi' ? ['vi', 'en'] : ['en', 'vi'];
  const column = (lang) => (
    <section key={lang} lang={lang} style={box}>
      <h2 style={{ fontSize: '0.875rem', margin: '0 0 0.25rem', color: C.muted }}>{t('requirements.detail.description')} · {lang.toUpperCase()}</h2>
      <p style={{ margin: 0 }}>{r[`description_${lang}`]}</p>
      <h3 style={{ fontSize: '0.875rem', margin: '0.75rem 0 0.25rem', color: C.muted }}>{t('requirements.detail.guidance')}</h3>
      <p style={{ margin: 0 }}>{r[`guidance_${lang}`]}</p>
    </section>
  );
  return (
    <main style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1rem' }}>
      <nav aria-label={t('requirements.detail.breadcrumb')} style={{ fontSize: '0.875rem' }}>
        <a href="/requirements" style={{ color: C.blue }}>{t('requirements.detail.breadcrumb')}</a> › <a href={filterHref({ topic: r.topic })} style={{ color: C.blue }}>{t(topicKey(r.topic))}</a> › {r.rule_code}
      </nav>
      {r.retired ? <p role="status" style={{ margin: 0, padding: '0.5rem 0.75rem', background: C.grey, borderRadius: '0.5rem' }}>{t('requirements.detail.retired', { date: vnDate(r.retired_at), version: r.retired_version })}</p> : null}
      <header>
        <h1 style={{ fontSize: '1.5rem', margin: 0, color: C.navy }}>{locale === 'vi' ? r.title_vi : r.title_en}</h1>
        <p style={{ margin: '0.25rem 0 0', color: C.muted }}>
          {r.rule_code} · {t(topicKey(r.topic))} · <strong>{t(severityKey(r.severity))}</strong> · {t('requirements.detail.segments', { segments: r.segments.join(', ') })}
          {r.is_sample ? <span style={{ color: C.amber }}> · {t('rules.sample')}</span> : null}
        </p>
      </header>
      <p style={{ margin: 0, fontSize: '0.875rem' }}>{t('requirements.detail.version', { version: r.rule_version, date: vnDate(r.approved_at) })}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))', gap: '1rem' }}>{langs.map(column)}</div>
      <section aria-label={t('requirements.detail.citation')} style={box}>
        <h2 style={{ fontSize: '0.875rem', margin: '0 0 0.25rem', color: C.muted }}>{t('requirements.detail.citation')}</h2>
        <p style={{ margin: 0 }}>{r.citation}</p>
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 16rem), 1fr))', gap: '0.75rem' }}>
        {r.retired ? null : <a href="/pre-check" style={action}>{t('requirements.detail.check')}</a>}
        <a href={consult} style={action}>{t('requirements.detail.consult')}</a>
      </div>
      {out.related.length ? (
        <section>
          <h2 style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('requirements.detail.related')}</h2>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {out.related.map(x => <li key={x.rule_code}><a href={`/requirements/${x.rule_slug}`} style={{ color: C.blue }}>{locale === 'vi' ? x.title_vi : x.title_en}</a> · {x.rule_code}</li>)}
          </ul>
        </section>
      ) : null}
      <p style={{ margin: 0, fontSize: '0.8125rem', color: C.muted }}>{t('requirements.disclaimer')}</p>
    </main>
  );
}
