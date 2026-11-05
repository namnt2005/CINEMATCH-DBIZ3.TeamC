'use client';
// SC-12, in the order of docs/screens/screen-spec-SC-12.md: sidebar (#2) → name, segment, organisation (#3) →
// shoot date and countdown (#4) → overall readiness (#5) → one card per shown gauge with its next step and
// button (#6–#9); then the Empty, Error and Success states. The deadline strip (#10, M5), recent activity (#11)
// and the consultation button (#12, SC-33) are not built yet. Nothing is computed here (BR-001, SR-052).
import { useState } from 'react';
import { useLocale, useT } from '../../../lib/i18n/client.js';
import { nextStepText } from '../../../lib/readiness/next-steps.js';
import { fromApiReadiness } from '../../../lib/db/project-shape.js';
import { shootLine } from '../projects-view.js';
import { gaugeLabels, gaugeCards, overall } from './dashboard-view.js';
import ProjectNav from './project-nav.js';

const C = { navy: '#0f2d52', blue: '#2563eb', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534' };

function GaugeCard({ card, row, documentTypes }) {
  const t = useT();
  const locale = useLocale();
  const sentence = row ? nextStepText(t, card.gauge, row, documentTypes, locale) : null;
  return (
    <li style={{ border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff', listStyle: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'baseline' }}>
        <h3 style={{ fontSize: '1rem', margin: 0 }}>{card.label}</h3>
        <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{card.display}{card.score === null ? '' : '%'}</span>
      </div>
      {card.counted ? null : <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: C.muted }}>{t('dashboard.not_counted')}</p>}
      {card.notReported ? <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: C.muted }}>{t('dashboard.not_reported')}</p> : null}
      {sentence ? (
        <p style={{ margin: '0.625rem 0 0' }}>
          <span style={{ display: 'block', fontSize: '0.75rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('dashboard.next_label')}</span>
          <strong>{sentence}</strong>
        </p>
      ) : null}
      <div style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>
        {card.button.href ? <a href={card.button.href} style={{ color: C.blue }}>{t(card.button.label)}</a> : null}
        {card.button.soon ? <span style={{ color: C.muted }}>{t(card.button.label)} · {t('landing.soon')}</span> : null}
        {card.button.phase2 ? <span style={{ color: C.muted }}>{t('dashboard.phase2')}</span> : null}
      </div>
    </li>
  );
}

export default function DashboardClient({ project, requirements, documentTypes, today, created }) {
  const t = useT();
  const locale = useLocale();
  const [row, setRow] = useState(project.readinessFailed ? null : project.readiness);
  const [retrying, setRetrying] = useState(false);
  const labels = gaugeLabels(requirements, project.segment, locale);
  const cards = gaugeCards(row, labels);
  const total = overall(row);
  const date = shootLine(project.shoot_date, today, 'dashboard.shoot');

  async function retry() {
    setRetrying(true);
    const res = await fetch(`/api/projects/${project.project_id}/readiness`).catch(() => null);
    setRetrying(false);
    if (res?.ok) setRow(fromApiReadiness(await res.json()));
  }

  return (
    <main style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), auto))', gap: '1.5rem', alignItems: 'start' }}>
      <ProjectNav t={t} projectId={project.project_id} current="overview" />
      <div style={{ minWidth: 0, flex: 1 }}>
        {created ? <p role="status" style={{ background: '#f0fdf4', color: C.green, padding: '0.625rem 0.875rem', borderRadius: '0.5rem', marginTop: 0 }}>{t('projects.created', { name: project.project_name })}</p> : null}
        {project.stage === 'archived' ? <p role="note" style={{ background: '#f3f4f6', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', marginTop: 0 }}>{t('dashboard.archived')}</p> : null}
        <h1 style={{ fontSize: '1.625rem', margin: 0, overflowWrap: 'anywhere' }}>{project.project_name}</h1>
        <p style={{ margin: '0.25rem 0 0', color: C.muted }}>
          {t('router.segment_label', { letter: project.segment })}{project.organisation ? ` · ${project.organisation}` : ''}
        </p>
        <p style={{ margin: '0.5rem 0 0' }}>
          {t(date.key, date.vars)}
          {project.shoot_date || project.stage === 'archived' ? null : <> · <a href={`/projects/${project.project_id}/settings`} style={{ color: C.blue }}>{t('dashboard.shoot.set')}</a></>}
        </p>

        <section aria-labelledby="overall" style={{ margin: '1.25rem 0', padding: '1rem', border: `1px solid ${C.border}`, borderRadius: '0.75rem' }}>
          <h2 id="overall" style={{ fontSize: '1rem', margin: 0 }}>{t('dashboard.overall')}</h2>
          <p style={{ fontSize: '2.25rem', fontWeight: 800, margin: '0.25rem 0' }}>{total.display}{total.value === null ? '' : '%'}</p>
          {total.error ? (
            <div role="alert">
              <p style={{ color: C.red, margin: '0 0 0.5rem' }}>{t(total.error)}</p>
              <button type="button" onClick={retry} disabled={retrying} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', font: 'inherit', cursor: 'pointer' }}>
                {retrying ? t('dashboard.loading') : t(total.retry)}
              </button>
            </div>
          ) : (
            <>
              <div aria-hidden="true" style={{ height: '0.5rem', background: C.border, borderRadius: '1rem' }}>
                <div style={{ width: `${total.value ?? 0}%`, height: '100%', background: C.blue, borderRadius: '1rem' }} />
              </div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: C.muted }}>{t(total.note.key, total.note.vars)}</p>
            </>
          )}
        </section>

        <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 15rem), 1fr))', gap: '0.875rem', padding: 0, margin: 0 }}>
          {cards.map(card => <GaugeCard key={card.gauge} card={card} row={row} documentTypes={documentTypes} />)}
        </ul>
        <p style={{ marginTop: '1.25rem', color: C.muted, fontSize: '0.875rem' }}>{t('dashboard.consultation')} · {t('landing.soon')}</p>
      </div>
    </main>
  );
}
