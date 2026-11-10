'use client';
// SC-29 in the order of docs/screens/screen-spec-SC-29.md: first shooting day (#3) and buffer (#4) — owner and edit only —,
// the recommended submission date card (#5, the most prominent, D8 wording), the milestones as a vertical list with a
// table alternative (#6, #7, #10), both paths (#8, #9), the holiday band (#11) and the basis line (#12). Recomputed on
// read by the server (the same function as SC-12 and SC-27, SR-173). Reminders (#13) are not built.
import { useState } from 'react';
import { useT } from '../../../../lib/i18n/client.js';
import ProjectNav from '../project-nav.js';
import { recommendedCard, timelineRows, milestoneStates, holidayBands, vnDate } from '../../../../lib/licensing/view.js';
import { BUFFER_CHOICES } from '../../../../lib/projects/input.js';

const C = { navy: '#0f2d52', blue: '#2563eb', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534', amber: '#92400e' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' };
const field = { display: 'block', marginTop: '0.25rem', padding: '0.4rem 0.5rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', font: 'inherit' };

export default function TimelineClient({ project, initial }) {
  const t = useT();
  const [timeline, setTimeline] = useState(initial);
  const [message, setMessage] = useState(null);
  const canEdit = ['owner', 'edit'].includes(project.permission) && project.stage !== 'archived';

  async function change(fields) {
    const res = await fetch(`/api/projects/${project.project_id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(fields) }).catch(() => null);
    if (!res?.ok) { setMessage({ ok: false, text: t('timeline.failed') }); return; }
    const next = await fetch(`/api/projects/${project.project_id}/timeline`).then(r => (r.ok ? r.json() : null)).catch(() => null);
    if (next) setTimeline(next);
    setMessage({ ok: true, text: t('timeline.saved') });
  }

  const card = recommendedCard(timeline);
  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '1.5rem', alignItems: 'start' }}>
      <ProjectNav t={t} projectId={project.project_id} current="timeline" />
      <main style={{ gridColumn: 'span 3', minWidth: 0, display: 'grid', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0, color: C.navy }}>{t('timeline.title')} · {project.project_name}</h1>
        {!timeline ? <p role="alert" style={{ color: C.red }}>{t('timeline.failed')}</p> : !timeline.applies ? <p style={box}>{t('timeline.segment_c')}</p> : (
          <>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <label style={{ ...box, flex: '1 1 12rem' }}>{t('timeline.shoot.label')}
                <input type="date" disabled={!canEdit} defaultValue={timeline.shoot_date || ''} onChange={e => e.target.value && change({ shoot_date: e.target.value })} style={field} />
              </label>
              <label style={{ ...box, flex: '1 1 12rem' }}>{t('timeline.buffer.label')}
                <select disabled={!canEdit} value={timeline.buffer_days} onChange={e => change({ buffer_days: Number(e.target.value) })} style={field}>
                  {BUFFER_CHOICES.map(n => <option key={n} value={n}>{t('timeline.buffer.days', { n })}</option>)}
                </select>
              </label>
            </div>
            {message ? <p role={message.ok ? 'status' : 'alert'} style={{ margin: 0, color: message.ok ? C.green : C.red }}>{message.text}</p> : null}
            {!card ? <p style={box}>{t('timeline.empty.no_date')}</p> : (
              <>
                <section aria-labelledby="recommended" style={{ ...box, border: `3px solid ${card.passed ? C.red : C.navy}` }}>
                  <h2 id="recommended" style={{ fontSize: '1rem', margin: 0, color: card.passed ? C.red : C.navy }}>{t(card.titleKey)}</h2>
                  <p style={{ fontSize: '2rem', fontWeight: 800, margin: '0.25rem 0' }}>{vnDate(card.date)}</p>
                  <p role={card.passed ? 'alert' : undefined} style={{ margin: 0 }}>{t(card.lineKey, { days: card.days })}</p>
                  {card.passed ? <p style={{ margin: '0.5rem 0 0' }}><a href="/consult" style={{ color: C.blue }}>{t('timeline.consult')}</a></p> : null}
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: C.muted }}>{t('timeline.latest.line', { date: vnDate(timeline.latest) })}</p>
                </section>
                <section aria-labelledby="paths" style={box}>
                  <h2 id="paths" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('timeline.paths.title')}</h2>
                  <p style={{ margin: 0 }}>{t('timeline.path.smooth', { submit: vnDate(timeline.smooth.submit), result: vnDate(timeline.smooth.result_by) })}</p>
                  <p style={{ margin: '0.25rem 0 0' }}>{t('timeline.path.resubmission', { result: vnDate(timeline.resubmission.result_by_worst) })}</p>
                  {holidayBands(timeline).map(h => (
                    <p key={h.from} style={{ margin: '0.5rem 0 0', padding: '0.375rem 0.625rem', background: '#fffbeb', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
                      {t('timeline.holiday.band', { name: h.name, from: vnDate(h.from), to: vnDate(h.to) })}{h.expectedKey ? ` · ${t(h.expectedKey)}` : ''}
                    </p>
                  ))}
                </section>
                <section aria-labelledby="milestones" style={box}>
                  <h2 id="milestones" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('timeline.milestones.title')}</h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['milestone', 'date', 'days'].map(k => <th key={k} scope="col" style={{ textAlign: 'left', fontSize: '0.8125rem', padding: '0.25rem', borderBottom: `1px solid ${C.border}` }}>{t(`timeline.table.${k}`)}</th>)}</tr></thead>
                    <tbody>
                      {timelineRows(timeline).map(r => (
                        <tr key={r.key} style={{ color: r.days < 0 ? C.red : 'inherit' }}>
                          <td style={{ padding: '0.25rem' }}>{t(`timeline.milestone.${r.key}`)}</td>
                          <td style={{ padding: '0.25rem' }}>{vnDate(r.date)}</td>
                          <td style={{ padding: '0.25rem' }}>{r.days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.875rem' }}>
                    {milestoneStates(timeline).filter(m => !m.date).map(m => <li key={m.key}>{t(`timeline.milestone.${m.key}`)} — {t(m.stateKey)}</li>)}
                  </ul>
                </section>
              </>
            )}
          </>
        )}
        <p style={{ margin: 0, fontSize: '0.8125rem', color: C.muted }}>{t('timeline.basis')}</p>
      </main>
    </div>
  );
}
