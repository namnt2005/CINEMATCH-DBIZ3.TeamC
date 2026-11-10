'use client';
// SC-30 in the order of docs/screens/screen-spec-SC-30.md: title (#2), rule set line (#3), topic filter with counts (#4),
// segment filter (#5), rule cards (#6–#12) with the Sample label (D15), pre-check call to action (#13), disclaimer (#14).
// Filters are buttons with aria-pressed; the choice is kept in the page URL (interactions 1–2).
import { useRouter } from 'next/navigation';
import { useT, useLocale } from '../../lib/i18n/client.js';
import { visibleCards, filterHref, topicKey } from '../../lib/requirements/view.js';
import { TOPICS, SEGMENTS } from '../../lib/legal/input.js';

const C = { navy: '#0f2d52', blue: '#2563eb', muted: '#6b7280', border: '#e5e7eb', amber: '#92400e', red: '#b91c1c' };
const chip = (on, empty) => ({ border: `1px solid ${on ? C.navy : C.border}`, background: on ? C.navy : '#fff', color: on ? '#fff' : empty ? C.muted : '#111827',
  borderRadius: '999px', padding: '0.3rem 0.75rem', font: 'inherit', fontSize: '0.875rem', cursor: 'pointer' });

export default function LibraryClient({ data, filters }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const go = (next) => router.push(filterHref({ ...filters, ...next }));
  if (!data) {
    return (
      <main style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
        <h1 style={{ fontSize: '1.5rem', color: C.navy }}>{t('requirements.title')}</h1>
        <p role="alert" style={{ color: C.red }}>{t('requirements.error.load')}</p>
        <button type="button" onClick={() => router.refresh()} style={chip(true)}>{t('requirements.retry')}</button>
      </main>
    );
  }
  const cards = visibleCards(data.rules, locale);
  return (
    <main style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1rem' }}>
      <header>
        <h1 style={{ fontSize: '1.5rem', margin: 0, color: C.navy }}>{t('requirements.title')}</h1>
        <p style={{ margin: '0.25rem 0 0', color: C.muted }}>{t('requirements.rule_set', { version: data.rule_version ?? '—', count: data.total })}</p>
      </header>
      <div role="group" aria-label={t('requirements.filter.topic')} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" aria-pressed={!filters.topic} onClick={() => go({ topic: null })} style={chip(!filters.topic)}>{t('requirements.filter.all_topics')}</button>
        {TOPICS.map(x => (
          <button key={x} type="button" aria-pressed={filters.topic === x} onClick={() => go({ topic: x })} style={chip(filters.topic === x, !data.counts[x])}
            aria-label={t('requirements.topic_count', { topic: t(topicKey(x)), count: data.counts[x] ?? 0 })}>
            {t(topicKey(x))} ({data.counts[x] ?? 0})
          </button>
        ))}
      </div>
      <div role="group" aria-label={t('requirements.filter.segment')} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: C.muted, fontSize: '0.875rem' }}>{t('requirements.filter.segment')}:</span>
        <button type="button" aria-pressed={!filters.segment} onClick={() => go({ segment: null })} style={chip(!filters.segment)}>{t('requirements.filter.all')}</button>
        {SEGMENTS.map(x => <button key={x} type="button" aria-pressed={filters.segment === x} onClick={() => go({ segment: x })} style={chip(filters.segment === x)} title={t(`router.segment.${x}`)}>{x} · {t(`router.segment.${x}`)}</button>)}
      </div>
      {cards.length === 0 ? (
        <p style={{ color: C.muted }}>{t('requirements.empty')} <a href={filterHref({ segment: filters.segment })} style={{ color: C.blue }}>{t('requirements.empty.back')}</a></p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 20rem), 1fr))', gap: '0.75rem' }}>
          {cards.map(c => (
            <li key={c.code} style={{ border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '0.875rem', background: '#fff', display: 'grid', gap: '0.375rem' }}>
              {c.sampleKey ? <span style={{ fontSize: '0.75rem', color: C.amber }}>{t(c.sampleKey)}</span> : null}
              <h2 style={{ fontSize: '1rem', margin: 0 }}><a href={c.href} style={{ color: '#111827', textDecoration: 'none' }}>{c.title}</a></h2>
              <span style={{ fontSize: '0.8125rem', color: C.muted }}>{c.code} · {t(c.topicKey)} · <strong>{t(c.severityKey)}</strong></span>
              <span style={{ fontSize: '0.8125rem' }}>{c.citation}</span>
              <span style={{ fontSize: '0.75rem', color: C.muted }}>{t('requirements.version', { version: c.version })}</span>
              <a href={c.href} style={{ color: C.blue, fontSize: '0.875rem' }}>{t('requirements.read')}</a>
            </li>
          ))}
        </ul>
      )}
      <p style={{ margin: 0 }}><a href="/pre-check" style={{ ...chip(true), display: 'inline-block', textDecoration: 'none' }}>{t('requirements.cta')}</a></p>
      <p style={{ margin: 0, fontSize: '0.8125rem', color: C.muted }}>{t('requirements.disclaimer')}</p>
    </main>
  );
}
