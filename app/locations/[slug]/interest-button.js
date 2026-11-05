'use client';
// SC-16 *I'm interested in this location* (M7 FR-001, R10): records the interest for one of the member's
// owner / edit projects, which drafts (or extends) that project's notice for the province on SC-32.
import { useState } from 'react';
import { useT } from '../../../lib/i18n/client.js';
import { interestChoice } from '../../projects/[id]/provinces/provinces-view.js';

const C = { navy: '#0f2d52', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534' };
const button = { background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 0.875rem', font: 'inherit', fontWeight: 600, cursor: 'pointer' };

export default function InterestButton({ locationId, signedIn, projects, loginHref }) {
  const t = useT();
  const choice = interestChoice({ signedIn, projects });
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState(choice.projects?.[0]?.project_id ?? '');
  const [done, setDone] = useState(null);
  const [failed, setFailed] = useState(null);

  if (choice.kind === 'signin') return <a href={loginHref} style={{ ...button, textDecoration: 'none', display: 'inline-block' }}>{t('notices.interest.signin')}</a>;
  if (choice.kind === 'none') return <a href="/projects" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}>{t('notices.interest.none')}</a>;
  if (done) return <a role="status" href={`/projects/${done}/provinces`} style={{ color: C.green, fontWeight: 600, textDecoration: 'none' }}>{t('notices.interest.done')}</a>;

  async function save(e) {
    e.preventDefault();
    setFailed(null);
    const res = await fetch(`/api/projects/${projectId}/interests`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ location_id: locationId }) }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (res?.status === 201) setDone(projectId);
    else setFailed(t(body.error === 'ALREADY_SENT' ? 'notices.interest.already_sent' : 'notices.interest.failed'));
  }

  if (!open) return <button type="button" style={button} onClick={() => setOpen(true)}>{t('notices.interest.button')}</button>;
  return (
    <form onSubmit={save} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <label style={{ fontSize: '0.8125rem' }}>{t('notices.interest.choose')}
        <select value={projectId} onChange={e => setProjectId(e.target.value)}
          style={{ display: 'block', marginTop: '0.25rem', padding: '0.5rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', font: 'inherit' }}>
          {choice.projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
        </select>
      </label>
      <button type="submit" style={button}>{t('notices.interest.button')}</button>
      {failed ? <p role="alert" style={{ color: C.red, width: '100%', margin: 0, fontSize: '0.875rem' }}>{failed}</p> : null}
    </form>
  );
}
