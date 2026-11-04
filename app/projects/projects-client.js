'use client';
// SC-10 My projects, in the order of docs/screens/screen-spec-SC-10.md: title + New project (#2) → stage tabs
// with counts (#3) → cards (#4–#7) → Create new project panel (#8–#16); then Empty, Error and Success states.
// The Invitations block (plan D3) sits above the cards. Every text from lib/i18n; numbers from the view (BR-001).
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useT } from '../../lib/i18n/client.js';
import { FORMATS, SEGMENTS, CREW_BANDS } from '../../lib/projects/input.js';
import { nextStepText } from '../../lib/readiness/next-steps.js';
import { panelFromQuery, canCreate, shootLine, tabs, readinessLabel } from './projects-view.js';

const C = { navy: '#0f2d52', blue: '#2563eb', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534', bg: '#f9fafb' };
const field = { display: 'block', width: '100%', padding: '0.5rem 0.625rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', font: 'inherit', boxSizing: 'border-box' };
const label = { display: 'block', fontWeight: 600, fontSize: '0.875rem', margin: '0.875rem 0 0.25rem' };
const button = { background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.625rem 1rem', font: 'inherit', fontWeight: 600, cursor: 'pointer' };
const EMPTY_FORM = { project_name: '', format: '', segment: '', shoot_date: '', shoot_days_vn: '', crew_size_band: '', provinces: [], logline: '' };

/** SC-10 #7: the card's one next step, the first open action of the view, as a sentence. */
function cardNextStep(t, project, documentTypes, locale) {
  const code = project.next_action_primary;
  if (!code) return null;
  if (code === 'done') return t('dashboard.next.done');
  const gauge = code.split('.')[0];
  return nextStepText(t, gauge, { ...project, [`${gauge}_action`]: code }, documentTypes, locale);
}

function Card({ project, today, documentTypes }) {
  const t = useT();
  const locale = useLocale();
  const value = readinessLabel(project.readiness_total);
  const date = shootLine(project.shoot_date, today);
  const next = cardNextStep(t, project, documentTypes, locale);
  return (
    <a href={`/projects/${project.project_id}`} style={{ display: 'block', border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', color: 'inherit', textDecoration: 'none', background: '#fff' }}>
      <strong style={{ display: 'block', fontSize: '1.0625rem', overflowWrap: 'anywhere' }}>{project.project_name}</strong>
      <span style={{ color: C.muted, fontSize: '0.875rem' }}>
        {t(`projects.format.${project.format}`)} · {t('router.segment_label', { letter: project.segment })}
        {project.stage === 'archived' ? ` · ${t('projects.card.archived')}` : ''}
      </span>
      <div style={{ margin: '0.625rem 0 0.25rem', fontSize: '0.875rem' }}>
        {value === null ? t('projects.card.readiness_unknown') : t('projects.card.readiness', { value })}
      </div>
      <div aria-hidden="true" style={{ height: '0.375rem', background: C.border, borderRadius: '1rem' }}>
        <div style={{ width: `${value ?? 0}%`, height: '100%', background: C.blue, borderRadius: '1rem' }} />
      </div>
      <p style={{ margin: '0.625rem 0 0', fontSize: '0.875rem', color: C.muted }}>{t(date.key, date.vars)}</p>
      {next ? <p style={{ margin: '0.375rem 0 0', fontSize: '0.875rem' }}><strong>{t('projects.card.next')}</strong> {next}</p> : null}
    </a>
  );
}

function Invitations({ invitations, onAccepted }) {
  const t = useT();
  const [busy, setBusy] = useState(null);
  const [failed, setFailed] = useState(false);
  if (!invitations.length) return null;
  async function accept(invitation) {
    setBusy(invitation.member_id);
    setFailed(false);
    const res = await fetch(`/api/invitations/${invitation.member_id}/accept`, { method: 'POST' }).catch(() => null);
    setBusy(null);
    if (res?.ok) onAccepted(invitation);
    else setFailed(true);
  }
  return (
    <section aria-labelledby="invitations" style={{ border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem', background: C.bg }}>
      <h2 id="invitations" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('projects.invitations.title')}</h2>
      {failed ? <p role="alert" style={{ color: C.red, margin: '0 0 0.5rem' }}>{t('projects.invitations.failed')}</p> : null}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {invitations.map(inv => (
          <li key={inv.member_id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', padding: '0.375rem 0' }}>
            <span>{t('projects.invitations.line', { project: inv.project_name, permission: t(`projects.permission.${inv.permission}`) })}</span>
            <button type="button" style={button} disabled={busy === inv.member_id} onClick={() => accept(inv)}>{t('projects.invitations.accept')}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CreatePanel({ initialSegment, provinces, onClose }) {
  const t = useT();
  const router = useRouter();
  const [form, setForm] = useState({ ...EMPTY_FORM, segment: initialSegment });
  const [errors, setErrors] = useState({});
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (name) => (e) => setForm(f => ({ ...f, [name]: e.target.value }));
  const touched = Object.entries(form).some(([k, v]) => (Array.isArray(v) ? v.length > 0 : Boolean(v)) && !(k === 'segment' && v === initialSegment));
  const ready = canCreate(form) && !busy;

  function toggleProvince(id) {
    setForm(f => ({ ...f, provinces: f.provinces.includes(id) ? f.provinces.filter(p => p !== id) : [...f.provinces, id] }));
  }
  function cancel() {
    if (touched && !window.confirm(t('projects.panel.discard'))) return;
    onClose();
  }
  async function submit(e) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setFailed(false);
    setErrors({});
    const res = await fetch('/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (res?.status === 201) {
      router.push(`/projects/${body.project_id}?created=1`);
      return;
    }
    setBusy(false);
    if (res?.status === 422 && body.fields) setErrors(body.fields);
    else if (body.error === 'NAME_TAKEN') setErrors({ project_name: 'projects.error.name_taken' });
    else if (body.error === 'NO_ORGANISATION') setErrors({ _: 'projects.error.no_organisation' });
    else setFailed(true); // SC-10 Error state: the input is kept
  }
  const error = (name) => (errors[name]
    ? <span id={`${name}-error`} role="alert" style={{ display: 'block', color: C.red, fontSize: '0.8125rem', marginTop: '0.25rem' }}>{t(errors[name])}</span>
    : null);
  const described = (name) => ({ 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${name}-error` : undefined });
  const optional = <span style={{ fontWeight: 400, color: C.muted }}> ({t('projects.field.optional')})</span>;

  return (
    <section aria-labelledby="create-project" style={{ border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1.25rem', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 id="create-project" style={{ fontSize: '1.125rem', margin: 0 }}>{t('projects.panel.title')}</h2>
        <button type="button" onClick={cancel} style={{ background: 'none', border: 'none', color: C.blue, font: 'inherit', cursor: 'pointer' }}>{t('projects.panel.close')}</button>
      </div>
      <p style={{ margin: '0.25rem 0 0', color: C.muted, fontSize: '0.875rem' }}>{t('projects.panel.required_note')}</p>
      {failed ? <p role="alert" style={{ background: '#fef2f2', color: C.red, padding: '0.5rem 0.75rem', borderRadius: '0.375rem' }}>{t('projects.panel.failed')}</p> : null}
      {errors._ ? <p role="alert" style={{ color: C.red }}>{t(errors._)} <a href="/account">{t('header.account')}</a></p> : null}
      <form onSubmit={submit} noValidate>
        <label htmlFor="project_name" style={label}>{t('projects.field.name')}</label>
        <input id="project_name" value={form.project_name} onChange={set('project_name')} maxLength={200} style={field} {...described('project_name')} />
        {error('project_name')}
        <label htmlFor="format" style={label}>{t('projects.field.format')}</label>
        <select id="format" value={form.format} onChange={set('format')} style={field} {...described('format')}>
          <option value="">{t('projects.field.choose')}</option>
          {FORMATS.map(f => <option key={f} value={f}>{t(`projects.format.${f}`)}</option>)}
        </select>
        {error('format')}
        <label htmlFor="segment" style={label}>{t('projects.field.segment')}</label>
        <select id="segment" value={form.segment} onChange={set('segment')} style={field} {...described('segment')}>
          <option value="">{t('projects.field.choose')}</option>
          {SEGMENTS.map(s => <option key={s} value={s}>{t('router.segment_label', { letter: s })} — {t(`router.segment.${s}`)}</option>)}
        </select>
        {error('segment')}
        <a href="/start" style={{ display: 'inline-block', marginTop: '0.375rem', fontSize: '0.875rem', color: C.blue }}>{t('projects.panel.redo_router')}</a>
        <label htmlFor="shoot_date" style={label}>{t('projects.field.shoot_date')}{optional}</label>
        <input id="shoot_date" type="date" value={form.shoot_date} onChange={set('shoot_date')} style={field} {...described('shoot_date')} />
        {error('shoot_date')}
        <label htmlFor="shoot_days_vn" style={label}>{t('projects.field.shoot_days')}{optional}</label>
        <input id="shoot_days_vn" type="number" min="1" max="365" step="1" value={form.shoot_days_vn} onChange={set('shoot_days_vn')} style={field} {...described('shoot_days_vn')} />
        {error('shoot_days_vn')}
        <label htmlFor="crew_size_band" style={label}>{t('projects.field.crew')}{optional}</label>
        <select id="crew_size_band" value={form.crew_size_band} onChange={set('crew_size_band')} style={field} {...described('crew_size_band')}>
          <option value="">{t('projects.field.choose')}</option>
          {CREW_BANDS.map(c => <option key={c} value={c}>{t(`projects.crew.${c}`)}</option>)}
        </select>
        {error('crew_size_band')}
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={label}>{t('projects.field.provinces')}{optional}</legend>
          <div style={{ maxHeight: '9rem', overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: '0.375rem', padding: '0.375rem 0.625rem' }}>
            {provinces.map(p => (
              <label key={p.province_id} style={{ display: 'block', fontSize: '0.875rem', padding: '0.125rem 0' }}>
                <input type="checkbox" checked={form.provinces.includes(p.province_id)} onChange={() => toggleProvince(p.province_id)} /> {p.name}
              </label>
            ))}
          </div>
        </fieldset>
        {error('provinces')}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button type="button" onClick={cancel} style={{ ...button, background: '#fff', color: C.navy, border: `1px solid ${C.border}` }}>{t('projects.panel.cancel')}</button>
          <button type="submit" disabled={!ready} aria-disabled={!ready} style={{ ...button, opacity: ready ? 1 : 0.5, cursor: ready ? 'pointer' : 'not-allowed' }}>
            {busy ? t('projects.panel.creating') : t('projects.panel.create')}
          </button>
        </div>
      </form>
    </section>
  );
}

export default function ProjectsClient({ initial, provinces, documentTypes, today }) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const fromQuery = panelFromQuery(params);
  const [panelOpen, setPanelOpen] = useState(fromQuery.open);
  const [stage, setStage] = useState(params.get('stage') || null);
  const [invitations, setInvitations] = useState(initial?.invitations ?? []);
  const [notice, setNotice] = useState(params.get('archived') ? t('projects.archived_notice', { name: params.get('archived') }) : null);

  function openPanel() {
    setPanelOpen(true);
    const next = new URLSearchParams(params.toString());
    next.set('new', '1');
    window.history.replaceState(null, '', `/projects?${next}`);
  }
  function closePanel() {
    setPanelOpen(false);
    window.history.replaceState(null, '', '/projects');
  }
  function accepted(invitation) {
    setInvitations(list => list.filter(i => i.member_id !== invitation.member_id));
    setNotice(t('projects.invitations.accepted', { name: invitation.project_name }));
    router.refresh();
  }

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
      <h1 style={{ fontSize: '1.625rem', margin: 0 }}>{t('projects.title')}</h1>
      <button type="button" style={button} onClick={openPanel}>{t('projects.new')}</button>
    </div>
  );

  if (initial === null) {
    return (
      <main style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
        {header}
        <p role="alert" style={{ color: C.red }}>{t('projects.load_failed')}</p>
        <button type="button" style={button} onClick={() => router.refresh()}>{t('projects.retry')}</button>
        {panelOpen ? <div style={{ marginTop: '1rem' }}><CreatePanel initialSegment={fromQuery.segment} provinces={provinces} onClose={closePanel} /></div> : null}
      </main>
    );
  }

  const tabList = tabs(initial.counts, stage);
  const active = tabList.find(tab => tab.active).stage;
  const shown = initial.projects.filter(p => p.stage === active);
  const none = initial.projects.length === 0;

  return (
    <main style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem' }}>
      {header}
      {notice ? <p role="status" style={{ background: '#f0fdf4', color: C.green, padding: '0.625rem 0.875rem', borderRadius: '0.5rem' }}>{notice}</p> : null}
      <Invitations invitations={invitations} onAccepted={accepted} />
      <div style={{ display: 'grid', gridTemplateColumns: panelOpen ? 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))' : '1fr', gap: '1.25rem', alignItems: 'start' }}>
        <div>
          {none ? (
            <div style={{ border: `1px dashed ${C.border}`, borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
              <p style={{ fontWeight: 600, margin: '0 0 0.75rem' }}>{t('projects.empty.title')}</p>
              <button type="button" style={button} onClick={openPanel}>{t('projects.empty.cta')}</button>
            </div>
          ) : (
            <>
              <div role="tablist" aria-label={t('projects.tabs')} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
                {tabList.map(tab => (
                  <button key={tab.stage} type="button" role="tab" aria-selected={tab.active} onClick={() => setStage(tab.stage)}
                    style={{ border: `1px solid ${tab.active ? C.navy : C.border}`, background: tab.active ? C.navy : '#fff', color: tab.active ? '#fff' : C.navy, borderRadius: '2rem', padding: '0.375rem 0.875rem', font: 'inherit', cursor: 'pointer' }}>
                    {t(`projects.tab.${tab.stage}`, { count: tab.count })}
                  </button>
                ))}
              </div>
              {shown.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 17rem), 1fr))', gap: '0.875rem' }}>
                  {shown.map(p => <Card key={p.project_id} project={p} today={today} documentTypes={documentTypes} />)}
                </div>
              ) : <p style={{ color: C.muted }}>{t('projects.empty.tab')}</p>}
            </>
          )}
        </div>
        {panelOpen ? <CreatePanel initialSegment={fromQuery.segment} provinces={provinces} onClose={closePanel} /> : null}
      </div>
    </main>
  );
}
