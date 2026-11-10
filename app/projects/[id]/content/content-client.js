'use client';
// SC-48 for a project: the latest saved check with the passages of the project's own text, each finding with the text of
// the rule revision it cites (BR-008), *Mark reviewed* with an optional note for owner and edit members (FR-014), and
// *Re-check with the new rules* when the rule set has changed (Q3). Every text from lib/i18n.
import { useState } from 'react';
import { useT } from '../../../../lib/i18n/client.js';
import ProjectNav from '../project-nav.js';
import FindingCard from '../../../pre-check/finding-card.js';

const C = { navy: '#0f2d52', blue: '#2563eb', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534', amber: '#92400e' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' };
const button = { background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.75rem', font: 'inherit', fontWeight: 600, cursor: 'pointer' };
const vnDate = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');

function Review({ finding, onDone }) {
  const t = useT();
  const [note, setNote] = useState(finding.reviewer_note || '');
  const [error, setError] = useState(null);
  async function review() {
    const res = await fetch(`/api/content-findings/${finding.finding_id}/review`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note }) }).catch(() => null);
    if (res?.ok) onDone(await res.json());
    else setError(t(res?.status === 422 ? 'content.error.note' : 'content.failed'));
  }
  return (
    <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.375rem' }}>
      <label style={{ fontSize: '0.8125rem' }}>{t('content.note.label')}
        <textarea rows={2} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', font: 'inherit', padding: '0.375rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem' }} />
      </label>
      <div><button type="button" onClick={review} style={button}>{t('content.review')}</button></div>
      {error ? <p role="alert" style={{ margin: 0, color: C.red }}>{error}</p> : null}
    </div>
  );
}

export default function ContentClient({ project, initial }) {
  const t = useT();
  const [run, setRun] = useState(initial);
  const canEdit = ['owner', 'edit'].includes(project.permission) && project.stage !== 'archived';
  const done = (out) => setRun(r => ({ ...r, findings: r.findings.map(f => (f.finding_id === out.finding_id ? { ...f, ...out } : f)) }));
  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 14rem), 1fr))', gap: '1.5rem', alignItems: 'start' }}>
      <ProjectNav t={t} projectId={project.project_id} current="content" />
      <main style={{ gridColumn: 'span 3', minWidth: 0, display: 'grid', gap: '1rem' }}>
        <header>
          <h1 style={{ fontSize: '1.5rem', margin: 0, color: C.navy }}>{t('content.title')} · {project.project_name}</h1>
          {run.run_id ? <p style={{ margin: '0.25rem 0 0', color: C.muted }}>{t('content.run', { version: run.rule_version, date: vnDate(run.run_at) })}</p> : null}
        </header>
        {!run.run_id ? (
          <section style={box}><p style={{ margin: 0 }}>{t('content.none')}</p><p style={{ margin: '0.5rem 0 0' }}><a href="/pre-check" style={{ color: C.blue }}>{t('content.start')}</a></p></section>
        ) : (
          <>
            {run.current === false ? <p role="status" style={{ ...box, margin: 0, color: C.amber }}>{t('content.outdated')} <a href="/pre-check" style={{ color: C.blue }}>{t('content.recheck')}</a></p> : null}
            {!canEdit ? <p style={{ margin: 0, color: C.muted, fontSize: '0.875rem' }}>{t('content.view_only')}</p> : null}
            <ul style={{ display: 'grid', gap: '0.5rem', margin: 0, padding: 0 }}>
              {run.findings.map(f => (
                <FindingCard key={f.finding_id} finding={f}>
                  <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', color: f.finding_status === 'reviewed' ? C.green : C.amber }}>
                    {t(`content.status.${f.finding_status}`)}{f.reviewer_note ? ` · ${f.reviewer_note}` : ''}
                  </p>
                  {canEdit && f.finding_status !== 'reviewed' ? <Review finding={f} onDone={done} /> : null}
                </FindingCard>
              ))}
            </ul>
          </>
        )}
        <p style={{ margin: 0, fontSize: '0.8125rem', color: C.muted }}>{t('precheck.disclaimer')}</p>
      </main>
    </div>
  );
}
