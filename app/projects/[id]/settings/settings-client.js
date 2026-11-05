'use client';
// SC-13, in the order of docs/screens/screen-spec-SC-13.md: sidebar (#2) → title and role (#3) → project details
// (#4–#10, stage select per the H2 decision) → segment, read-only here (#11–#15 are M1 US-3) → members and
// invitations (#16–#22) → archive (#23–#24). No delete anywhere (SR-275). Every text from lib/i18n.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '../../../../lib/i18n/client.js';
import { formatDate, formatTime } from '../../../../lib/i18n/format.js';
import { LOGLINE_MAX, INVITE_PERMISSIONS } from '../../../../lib/projects/input.js';
import ProjectNav from '../project-nav.js';
import { canEdit, canInvite, showArchive, stageOptions, isAlone, memberLine } from './settings-view.js';

const C = { navy: '#0f2d52', blue: '#2563eb', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534' };
const card = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.25rem', background: '#fff' };
const field = { display: 'block', width: '100%', padding: '0.5rem 0.625rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', font: 'inherit', boxSizing: 'border-box' };
const label = { display: 'block', fontWeight: 600, fontSize: '0.875rem', margin: '0.875rem 0 0.25rem' };
const button = { background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.625rem 1rem', font: 'inherit', fontWeight: 600, cursor: 'pointer' };
const strip = (ok) => ({ background: ok ? '#f0fdf4' : '#fef2f2', color: ok ? C.green : C.red, padding: '0.5rem 0.75rem', borderRadius: '0.375rem' });

async function send(url, method, body) {
  const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  return { res, body: res ? await res.json().catch(() => ({})) : {} };
}

function Details({ project, today, onSaved }) {
  const t = useT();
  const editable = canEdit(project);
  const initial = { project_name: project.project_name, shoot_date: project.shoot_date || '', logline: project.logline || '', stage: project.stage };
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(project.updated_at);
  const [busy, setBusy] = useState(false);
  const changed = Object.keys(form).filter(k => form[k] !== saved[k]);
  const set = (name) => (e) => setForm(f => ({ ...f, [name]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    if (!changed.length || busy) return;
    setBusy(true);
    setErrors({});
    setNotice(null);
    const fields = Object.fromEntries(changed.map(k => [k, k === 'shoot_date' && !form[k] ? null : form[k]]));
    const { res, body } = await send(`/api/projects/${project.project_id}`, 'PATCH', fields);
    setBusy(false);
    if (res?.ok) {
      setSaved(form);
      setUpdatedAt(body.updated_at);
      setNotice({ ok: true, key: 'settings.saved' });
      onSaved();
    } else if (res?.status === 422 && body.fields) setErrors(body.fields);
    else if (body.error === 'NAME_TAKEN') setErrors({ project_name: 'projects.error.name_taken' });
    else setNotice({ ok: false, key: 'settings.save_failed' }); // changes kept in the form
  }
  const error = (name) => (errors[name] ? <span id={`${name}-error`} role="alert" style={{ display: 'block', color: C.red, fontSize: '0.8125rem', marginTop: '0.25rem' }}>{t(errors[name])}</span> : null);
  const described = (name) => ({ 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${name}-error` : undefined });

  return (
    <section aria-labelledby="details" style={card}>
      <h2 id="details" style={{ fontSize: '1.125rem', margin: 0 }}>{t('settings.details.title')}</h2>
      {editable ? null : <p role="note" style={{ color: C.muted, margin: '0.375rem 0 0' }}>{t(project.stage === 'archived' ? 'settings.archived_read_only' : 'settings.read_only')}</p>}
      {notice ? <p role={notice.ok ? 'status' : 'alert'} style={strip(notice.ok)}>{t(notice.key)}</p> : null}
      <form onSubmit={save} noValidate>
        <label htmlFor="project_name" style={label}>{t('projects.field.name')}</label>
        <input id="project_name" value={form.project_name} onChange={set('project_name')} maxLength={200} readOnly={!editable} style={field} {...described('project_name')} />
        {error('project_name')}
        <span style={label}>{t('projects.field.format')}</span>
        <p style={{ margin: 0 }}>{t(`projects.format.${project.format}`)} <span style={{ color: C.muted, fontSize: '0.8125rem' }}>· {t('settings.field.format_note')}</span></p>
        <label htmlFor="shoot_date" style={label}>{t('projects.field.shoot_date')}</label>
        <input id="shoot_date" type="date" min={today} value={form.shoot_date} onChange={set('shoot_date')} readOnly={!editable} style={field} {...described('shoot_date')} />
        {error('shoot_date')}
        <label htmlFor="logline" style={label}>{t('projects.field.logline')}</label>
        <textarea id="logline" rows={3} maxLength={LOGLINE_MAX} value={form.logline} onChange={set('logline')} readOnly={!editable} style={field} {...described('logline')} />
        <span style={{ display: 'block', textAlign: 'right', fontSize: '0.75rem', color: C.muted }}>{t('settings.logline_count', { count: form.logline.length })}</span>
        {error('logline')}
        <label htmlFor="stage" style={label}>{t('settings.field.stage')}</label>
        {stageOptions(project).length ? (
          <select id="stage" value={form.stage} onChange={set('stage')} style={field} {...described('stage')}>
            {stageOptions(project).map(s => <option key={s} value={s}>{t(`projects.stage.${s}`)}</option>)}
          </select>
        ) : <p id="stage" style={{ margin: 0 }}>{t(`projects.stage.${project.stage}`)}</p>}
        {error('stage')}
        {editable ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
            <button type="submit" disabled={!changed.length || busy} style={{ ...button, opacity: changed.length && !busy ? 1 : 0.5 }}>{busy ? t('settings.saving') : t('settings.save')}</button>
            {updatedAt ? <span style={{ color: C.muted, fontSize: '0.8125rem' }}>{t('settings.last_saved', { time: `${formatDate(updatedAt)} ${formatTime(updatedAt)}` })}</span> : null}
          </div>
        ) : null}
      </form>
    </section>
  );
}

function Members({ project, userId }) {
  const t = useT();
  const [members, setMembers] = useState(project.members);
  const [form, setForm] = useState({ invitee_email: '', permission: 'edit' });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  async function invite(e) {
    e.preventDefault();
    if (busy || !form.invitee_email.trim()) return;
    setBusy(true);
    setErrors({});
    setNotice(null);
    const { res, body } = await send(`/api/projects/${project.project_id}/invitations`, 'POST', form);
    setBusy(false);
    if (res?.status === 201) {
      const email = form.invitee_email.trim().toLowerCase();
      setMembers(list => [...list, { member_id: body.member_id, invitee_email: email, permission: form.permission, invite_status: 'pending', full_name: null }]);
      setNotice({ ok: true, text: t('settings.invite.sent', { email }) });
      setForm({ invitee_email: '', permission: 'edit' });
    } else if (res?.status === 422 && body.fields) setErrors(body.fields);
    else if (body.error === 'ALREADY_INVITED') setErrors({ invitee_email: 'settings.error.already_invited' });
    else setNotice({ ok: false, text: t('settings.invite.failed') });
  }

  return (
    <section aria-labelledby="members" style={card}>
      <h2 id="members" style={{ fontSize: '1.125rem', margin: 0 }}>{t('settings.members.title')}</h2>
      {notice ? <p role={notice.ok ? 'status' : 'alert'} style={strip(notice.ok)}>{notice.text}</p> : null}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0' }}>
        {members.map((m) => {
          const line = memberLine(m);
          return (
            <li key={m.member_id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', padding: '0.5rem 0', borderTop: `1px solid ${C.border}` }}>
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                <strong>{line.name ? (line.name.startsWith('settings.') ? t(line.name) : line.name) : (line.email || t('settings.members.hidden_email'))}</strong>
                {m.user_id === userId ? ` ${t('settings.members.you')}` : ''}
                {line.name && line.email ? <span style={{ display: 'block', color: C.muted, fontSize: '0.8125rem' }}>{line.email}</span> : null}
              </span>
              <span style={{ color: C.muted, fontSize: '0.875rem' }}>{t(line.role)} · {t(line.status)}</span>
            </li>
          );
        })}
      </ul>
      {isAlone(members) ? <p style={{ color: C.muted, margin: '0.5rem 0 0' }}>{t('settings.members.alone')}</p> : null}
      {canInvite(project) ? (
        <form onSubmit={invite} noValidate style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '1rem' }}>
          <div style={{ flex: '1 1 14rem' }}>
            <label htmlFor="invitee_email" style={label}>{t('settings.invite.email')}</label>
            <input id="invitee_email" type="email" maxLength={254} value={form.invitee_email} onChange={e => setForm(f => ({ ...f, invitee_email: e.target.value }))}
              style={field} aria-invalid={Boolean(errors.invitee_email)} aria-describedby={errors.invitee_email ? 'invitee_email-error' : undefined} />
            {errors.invitee_email ? <span id="invitee_email-error" role="alert" style={{ color: C.red, fontSize: '0.8125rem' }}>{t(errors.invitee_email)}</span> : null}
          </div>
          <div>
            <label htmlFor="permission" style={label}>{t('settings.invite.permission')}</label>
            <select id="permission" value={form.permission} onChange={e => setForm(f => ({ ...f, permission: e.target.value }))} style={field}>
              {INVITE_PERMISSIONS.map(p => <option key={p} value={p}>{t(`projects.permission.${p}`)}</option>)}
            </select>
          </div>
          <button type="submit" disabled={busy || !form.invitee_email.trim()} style={{ ...button, opacity: busy || !form.invitee_email.trim() ? 0.5 : 1 }}>{t('settings.invite.send')}</button>
        </form>
      ) : null}
    </section>
  );
}

function Archive({ project }) {
  const t = useT();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  if (!showArchive(project)) return null;
  async function archive() {
    if (!window.confirm(t('settings.archive.confirm', { name: project.project_name }))) return;
    setFailed(false);
    const { res } = await send(`/api/projects/${project.project_id}/archive`, 'POST');
    if (res?.ok) router.push(`/projects?stage=archived&archived=${encodeURIComponent(project.project_name)}`);
    else setFailed(true);
  }
  return (
    <section aria-labelledby="archive" style={card}>
      <h2 id="archive" style={{ fontSize: '1.125rem', margin: 0 }}>{t('settings.archive.title')}</h2>
      <p style={{ margin: '0.5rem 0 1rem', color: '#374151' }}>{t('settings.archive.text')}</p>
      {failed ? <p role="alert" style={strip(false)}>{t('settings.archive.failed')}</p> : null}
      <button type="button" onClick={archive} style={{ ...button, background: '#fff', color: C.red, border: `1px solid ${C.red}` }}>{t('settings.archive.button')}</button>
    </section>
  );
}

export default function SettingsClient({ project, userId, today }) {
  const t = useT();
  const router = useRouter();
  return (
    <main style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), auto))', gap: '1.5rem', alignItems: 'start' }}>
      <ProjectNav t={t} projectId={project.project_id} current="settings" />
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: '1.625rem', margin: 0, overflowWrap: 'anywhere' }}>{t('settings.title')} · {project.project_name}</h1>
        <p style={{ margin: '0.25rem 0 1.25rem', color: C.muted }}>{t('settings.role', { role: t(`projects.permission.${project.permission}`) })}</p>
        <Details project={project} today={today} onSaved={() => router.refresh()} />
        <section aria-labelledby="segment" style={card}>
          <h2 id="segment" style={{ fontSize: '1.125rem', margin: 0 }}>{t('settings.field.segment', { letter: project.segment })}</h2>
          <p style={{ margin: '0.375rem 0 0', color: C.muted }}>{t(`router.segment.${project.segment}`)} · {t('settings.field.segment_note')}</p>
        </section>
        <Members project={project} userId={userId} />
        <Archive project={project} />
      </div>
    </main>
  );
}
