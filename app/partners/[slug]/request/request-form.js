'use client';
// SC-23 in the order of docs/screens/screen-spec-SC-23.md: breadcrumb (#2), recipient summary (#3), project (#4–#5),
// services with the organisation's own first (#6), note with its counter (#7), Article 13 notice (#8), what happens
// next (#9), Send (#10) and Cancel (#11). Every text from lib/i18n.
import { useState } from 'react';
import { useT } from '../../../../lib/i18n/client.js';
import { orderedServices, noteCounter, canSend, showArt13Notice, NOTE_MAX } from '../../../requests/request-view.js';

const C = { navy: '#0f2d52', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', amber: '#92400e', green: '#166534' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' };

export default function RequestForm({ org, projects, title }) {
  const t = useT();
  const [projectId, setProjectId] = useState(projects[0]?.project_id ?? '');
  const [services, setServices] = useState(org.service_groups.slice(0, 1));
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const counter = noteCounter(note);
  const project = projects.find(p => p.project_id === projectId);
  const toggle = (g) => setServices(list => (list.includes(g) ? list.filter(x => x !== g) : [...list, g]));

  async function send(e) {
    e.preventDefault();
    if (!canSend({ project_id: projectId, services, note })) return;
    setSending(true);
    setError(null);
    const res = await fetch('/api/requests', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, org_id: org.org_id, services, note }) }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    setSending(false);
    if (res?.status === 201) window.location.assign(`/requests/${body.request_id}`);
    else setError(body.error ? `partners.api.${String(body.error).toLowerCase()}` : 'requests.failed');
  }

  return (
    <main style={{ maxWidth: '820px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1rem' }}>
      <nav style={{ fontSize: '0.875rem' }}>
        <a href="/partners" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('partners.profile.breadcrumb')}</a> ›{' '}
        <a href={`/partners/${org.slug}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{org.org_name}</a> › {t('partners.send_request')}
      </nav>
      <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{title}</h1>
      <section style={box}>
        <strong>{t('requests.form.to', { org: org.org_name })}</strong>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: org.verified ? C.green : C.amber }}>{org.verified ? t('partners.verified_short') : t('partners.not_verified')}</p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: C.muted }}>{org.service_groups.map(g => t(`partners.group.${g}`)).join(' · ')}</p>
      </section>
      {!org.active ? <p role="alert" style={{ ...box, color: C.red }}>{t('requests.form.inactive')}</p> : projects.length === 0 ? (
        <p style={{ ...box, color: C.muted }}>{t('requests.form.no_project')} <a href="/projects" style={{ color: '#2563eb' }}>{t('header.projects')}</a></p>
      ) : (
        <form onSubmit={send} style={{ ...box, display: 'grid', gap: '1rem' }}>
          <label style={{ fontWeight: 600 }}>{t('requests.form.project')}
            <select value={projectId} onChange={e => setProjectId(e.target.value)} style={{ display: 'block', width: '100%', marginTop: '0.375rem', padding: '0.5rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', font: 'inherit', fontWeight: 400 }}>
              {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
            </select>
          </label>
          {project ? <p style={{ margin: 0, fontSize: '0.875rem', color: C.muted }}>{t('requests.project_line', { project: project.project_name, date: project.shoot_date ? project.shoot_date.split('-').reverse().join('/') : '—' })}</p> : null}
          <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
            <legend style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{t('requests.form.services')}</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {orderedServices(org.service_groups).map(g => (
                <button key={g} type="button" aria-pressed={services.includes(g)} onClick={() => toggle(g)}
                  style={{ border: `1px solid ${services.includes(g) ? C.navy : C.border}`, background: services.includes(g) ? C.navy : '#fff', color: services.includes(g) ? '#fff' : '#111827', borderRadius: '1rem', padding: '0.3rem 0.7rem', font: 'inherit', fontSize: '0.8125rem', cursor: 'pointer' }}>
                  {t(`partners.group.${g}`)}
                </button>
              ))}
            </div>
          </fieldset>
          <label style={{ fontWeight: 600 }}>{t('requests.form.note')}
            <textarea rows={4} value={note} maxLength={NOTE_MAX + 50} onChange={e => setNote(e.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.375rem', padding: '0.5rem', border: `1px solid ${counter.over ? C.red : C.border}`, borderRadius: '0.375rem', font: 'inherit', fontWeight: 400 }} />
            <span style={{ display: 'block', textAlign: 'right', fontSize: '0.75rem', fontWeight: 400, color: counter.over ? C.red : C.muted }}>{t('requests.form.counter', { length: counter.length, max: counter.max })}</span>
          </label>
          {showArt13Notice(org) ? <p role="note" style={{ margin: 0, background: '#fdf3dc', color: C.amber, padding: '0.625rem 0.875rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>{t('requests.form.art13')}</p> : null}
          <div style={{ background: '#f5f8fc', borderRadius: '0.5rem', padding: '0.75rem' }}>
            <strong style={{ fontSize: '0.875rem' }}>{t('requests.form.next')}</strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>{t('requests.form.next_steps')}</p>
          </div>
          {error ? <p role="alert" style={{ color: C.red, margin: 0 }}>{t(error)}</p> : null}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button type="submit" disabled={!canSend({ project_id: projectId, services, note }) || sending}
              style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.55rem 1rem', font: 'inherit', fontWeight: 600, opacity: canSend({ project_id: projectId, services, note }) && !sending ? 1 : 0.5 }}>
              {t('requests.form.send')}
            </button>
            <a href={`/partners/${org.slug}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{t('requests.form.cancel')}</a>
          </div>
        </form>
      )}
    </main>
  );
}
