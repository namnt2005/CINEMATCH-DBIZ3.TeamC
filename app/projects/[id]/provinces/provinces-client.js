'use client';
// SC-32 Provincial notices — member side, in the order of docs/screens/screen-spec-SC-32.md: sidebar (#2), title and
// purpose (#3), one card per province with the 4-step progress, reply and next action (#4–#7, #10), the letter
// preview (#8–#9), *+ Add province* (#11) and the permit note (#12); then Empty, Error and Success. The system never
// sends a notice (M7 BR-001): the crew downloads the approved letter and sends it. Every text from lib/i18n.
import { useState } from 'react';
import { useLocale, useT } from '../../../../lib/i18n/client.js';
import { buildLetter, RECIPIENTS } from '../../../../lib/notices/letter.js';
import ProjectNav from '../project-nav.js';
import { steps, cardAction, replyLine, PERMIT_NOTE, REPLY_CHOICES, formatDate } from './provinces-view.js';

const C = { navy: '#0f2d52', blue: '#2563eb', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534', amber: '#92400e' };
const button = { background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 0.875rem', font: 'inherit', fontWeight: 600, cursor: 'pointer' };
const ghost = { ...button, background: '#fff', color: C.navy, border: `1px solid ${C.border}` };
const field = { display: 'block', width: '100%', padding: '0.5rem 0.625rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', font: 'inherit', boxSizing: 'border-box' };

async function send(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) }).catch(() => null);
  return { res, body: res ? await res.json().catch(() => ({})) : {} };
}

function Stepper({ notice }) {
  const t = useT();
  return (
    <ol style={{ display: 'flex', gap: '0.375rem', listStyle: 'none', padding: 0, margin: '0.625rem 0', flexWrap: 'wrap' }}>
      {steps(notice).map((s, i, all) => {
        const current = !s.done && (i === 0 || all[i - 1].done);
        return (
          <li key={s.key} aria-current={current ? 'step' : undefined}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '1rem', border: `1px solid ${s.done ? C.green : C.border}`, color: s.done ? C.green : current ? C.navy : C.muted, fontWeight: current ? 700 : 400 }}>
            {i + 1}. {t(`notices.step.${s.key}`)}
          </li>
        );
      })}
    </ol>
  );
}

function Card({ notice, project, selected, onSelect, onChanged }) {
  const t = useT();
  const locale = useLocale();
  const [recipient, setRecipient] = useState(notice.recipient || 'peoples_committee');
  const [reply, setReply] = useState({ response: '', note: '' });
  const [notice2, setNotice2] = useState(null);
  const [busy, setBusy] = useState(false);
  const action = cardAction(notice, project.permission, { archived: project.stage === 'archived' });
  const line = replyLine(notice);
  const names = notice.locations.map(l => (locale === 'vi' ? l.name_vi : l.name_en)).join(', ');

  async function submit() {
    setBusy(true);
    const { res, body } = await send(`/api/notices/${notice.notice_id}/submit`);
    setBusy(false);
    if (res?.ok) onChanged(t('notices.submitted'));
    else setNotice2(body.error === 'SHOOT_DATE_REQUIRED' ? t('notices.missing.shoot_date') : t('notices.failed'));
  }
  async function download(kind) {
    setBusy(true);
    if (action.record) {
      const { res } = await send(`/api/notices/${notice.notice_id}/download`, { recipient });
      if (!res?.ok) { setBusy(false); setNotice2(t('notices.failed')); return; }
    }
    setBusy(false);
    const url = kind === 'pdf'
      ? `/projects/${project.project_id}/provinces/${notice.notice_id}/print?recipient=${recipient}`
      : `/api/notices/${notice.notice_id}/letter?format=docx&recipient=${recipient}`;
    window.open(url, kind === 'pdf' ? '_blank' : '_self');
    if (action.record) onChanged(null);
  }
  async function saveReply(e) {
    e.preventDefault();
    if (!reply.response) return;
    setBusy(true);
    const { res } = await send(`/api/notices/${notice.notice_id}/reply`, { response: reply.response, note: reply.note || undefined });
    setBusy(false);
    if (res?.ok) onChanged(t('notices.reply_saved'));
    else setNotice2(t('notices.failed'));
  }

  return (
    <li style={{ listStyle: 'none', border: `1px solid ${selected ? C.navy : C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' }}>
      <button type="button" onClick={onSelect} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
        <strong style={{ fontSize: '1.0625rem' }}>{notice.province.name}</strong>
        <span style={{ display: 'block', color: C.muted, fontSize: '0.8125rem' }}>{t('notices.locations', { names })}</span>
      </button>
      <Stepper notice={notice} />
      <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
        <strong>{t('notices.reply.label')}:</strong> {t(line.status)}{line.date ? ` · ${t('notices.reply.on', { date: line.date })}` : ''}
      </p>
      {line.note ? <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{line.note}</p> : null}
      {notice2 ? <p role="alert" style={{ color: C.red, fontSize: '0.875rem' }}>{notice2}</p> : null}
      <div style={{ marginTop: '0.625rem' }}>
        {action.kind === 'submit' || action.kind === 'resubmit' ? (
          <>
            {action.kind === 'resubmit' ? <p style={{ color: C.amber, fontSize: '0.875rem', margin: '0 0 0.5rem' }}><strong>{t('notices.action.changes')}</strong> {action.note}</p> : null}
            <button type="button" style={{ ...button, opacity: action.disabled || busy ? 0.5 : 1 }} disabled={action.disabled || busy} aria-describedby={action.disabled ? `why-${notice.notice_id}` : undefined} onClick={submit}>
              {t(action.kind === 'resubmit' ? 'notices.action.resubmit' : 'notices.action.submit')}
            </button>
            {action.disabled ? <span id={`why-${notice.notice_id}`} style={{ display: 'block', color: C.red, fontSize: '0.8125rem', marginTop: '0.25rem' }}>{t(action.reason)}</span> : null}
          </>
        ) : null}
        {action.kind === 'waiting' ? <p style={{ color: C.muted, margin: 0 }}>{t('notices.action.waiting')}</p> : null}
        {action.kind === 'download' || action.kind === 'reply' ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ fontSize: '0.8125rem' }}>{t('notices.action.recipient')}
              <select value={recipient} onChange={e => setRecipient(e.target.value)} style={{ ...field, marginTop: '0.25rem' }} disabled={Boolean(notice.sent_at) && action.kind === 'reply'}>
                {RECIPIENTS.map(r => <option key={r} value={r}>{t(`notices.recipient.${r}`)}</option>)}
              </select>
            </label>
            <button type="button" style={ghost} disabled={busy} onClick={() => download('docx')}>{t('notices.action.download_docx')}</button>
            <button type="button" style={ghost} disabled={busy} onClick={() => download('pdf')}>{t('notices.action.download_pdf')}</button>
          </div>
        ) : null}
        {notice.sent_at ? <p style={{ color: C.muted, fontSize: '0.8125rem', margin: '0.375rem 0 0' }}>{t('notices.sent_hint', { date: formatDate(notice.sent_at) })}</p> : null}
        {action.kind === 'reply' ? (
          <form onSubmit={saveReply} style={{ marginTop: '0.75rem', borderTop: `1px solid ${C.border}`, paddingTop: '0.75rem' }}>
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('notices.action.reply')}</legend>
              {REPLY_CHOICES.map(r => (
                <label key={r} style={{ display: 'block', fontSize: '0.875rem' }}>
                  <input type="radio" name={`reply-${notice.notice_id}`} value={r} checked={reply.response === r} onChange={() => setReply(x => ({ ...x, response: r }))} /> {t(`notices.reply.${r}`)}
                </label>
              ))}
            </fieldset>
            <label style={{ display: 'block', fontSize: '0.8125rem', marginTop: '0.5rem' }}>{t('notices.action.reply_note')}
              <textarea rows={2} maxLength={2000} value={reply.note} onChange={e => setReply(x => ({ ...x, note: e.target.value }))} style={{ ...field, marginTop: '0.25rem' }} />
            </label>
            <button type="submit" style={{ ...button, marginTop: '0.5rem', opacity: reply.response ? 1 : 0.5 }} disabled={!reply.response || busy}>{t('notices.action.reply_save')}</button>
          </form>
        ) : null}
      </div>
    </li>
  );
}

function Preview({ notice, project }) {
  const t = useT();
  if (!notice) return null;
  const letter = buildLetter({ projectName: project.project_name, provinceName: notice.province.name, summary: notice.summary }, notice.recipient || 'peoples_committee');
  return (
    <section aria-labelledby="preview" style={{ border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' }}>
      <h2 id="preview" style={{ fontSize: '1rem', margin: 0 }}>{t('notices.preview')}</h2>
      <p style={{ color: C.muted, fontSize: '0.8125rem', margin: '0.25rem 0 0.75rem' }}>{t('notices.preview_hint')}</p>
      {letter.paragraphs.map((p, i) => <p key={i} lang={p.lang} style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: i === 0 || p.lang !== letter.paragraphs[i - 1]?.lang ? 600 : 400 }}>{p.text}</p>)}
    </section>
  );
}

function AddProvince({ project, notices, locations, onAdded }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState('');
  const [failed, setFailed] = useState(null);
  const sentProvinces = new Set(notices.filter(n => n.sent_at).map(n => n.province.id));
  const known = new Set(notices.flatMap(n => n.locations.map(l => l.location_id)));
  const options = locations.filter(l => !sentProvinces.has(l.province_id) && !known.has(l.location_id));
  async function add(e) {
    e.preventDefault();
    if (!choice) return;
    const { res, body } = await send(`/api/projects/${project.project_id}/interests`, { location_id: choice });
    const province = locations.find(l => l.location_id === choice)?.province_name;
    if (res?.status === 201) { setOpen(false); setChoice(''); onAdded(t(body.created ? 'notices.added' : 'notices.joined', { province })); }
    else setFailed(body.error === 'ALREADY_SENT' ? t('notices.interest.already_sent') : t('notices.failed'));
  }
  if (!['owner', 'edit'].includes(project.permission) || project.stage === 'archived') return null;
  if (!open) return <button type="button" style={button} onClick={() => setOpen(true)}>{t('notices.add_province')}</button>;
  return (
    <form onSubmit={add} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      {options.length ? (
        <label style={{ fontSize: '0.875rem', flex: '1 1 16rem' }}>{t('notices.add_choose')}
          <select value={choice} onChange={e => setChoice(e.target.value)} style={{ ...field, marginTop: '0.25rem' }}>
            <option value="">{t('projects.field.choose')}</option>
            {options.map(l => <option key={l.location_id} value={l.location_id}>{l.province_name} — {locale === 'vi' ? l.name_vi : l.name_en}</option>)}
          </select>
        </label>
      ) : <p style={{ color: C.muted }}>{t('notices.add_none')}</p>}
      <button type="submit" style={{ ...button, opacity: choice ? 1 : 0.5 }} disabled={!choice}>{t('notices.add_submit')}</button>
      <button type="button" style={ghost} onClick={() => setOpen(false)}>{t('projects.panel.cancel')}</button>
      {failed ? <p role="alert" style={{ color: C.red, width: '100%' }}>{failed}</p> : null}
    </form>
  );
}

export default function ProvincesClient({ project, initialNotices, locations }) {
  const t = useT();
  const [notices, setNotices] = useState(initialNotices);
  const [selected, setSelected] = useState(initialNotices[0]?.notice_id ?? null);
  const [status, setStatus] = useState(null);

  async function reload(message) {
    const res = await fetch(`/api/projects/${project.project_id}/notices`).catch(() => null);
    if (res?.ok) {
      const body = await res.json();
      setNotices(body.notices);
      if (!selected && body.notices[0]) setSelected(body.notices[0].notice_id);
    }
    if (message) setStatus(message);
  }
  const current = notices.find(n => n.notice_id === selected) ?? notices[0];

  return (
    <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 12rem), auto))', gap: '1.5rem', alignItems: 'start' }}>
      <ProjectNav t={t} projectId={project.project_id} current="provinces" />
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: '1.625rem', margin: 0 }}>{t('notices.title')} · {project.project_name}</h1>
        <p style={{ margin: '0.25rem 0 1rem', color: C.muted }}>{t('notices.purpose')}</p>
        <p role="note" style={{ background: '#fdf3dc', border: '1px solid #f0d9a8', color: '#7c4a03', borderRadius: '0.5rem', padding: '0.625rem 0.875rem' }}>{t(PERMIT_NOTE)}</p>
        {status ? <p role="status" style={{ background: '#f0fdf4', color: C.green, padding: '0.625rem 0.875rem', borderRadius: '0.5rem' }}>{status}</p> : null}
        {['owner', 'edit'].includes(project.permission) ? null : <p role="note" style={{ color: C.muted }}>{t('notices.read_only')}</p>}
        <div style={{ margin: '0.75rem 0 1rem' }}>
          <AddProvince project={project} notices={notices} locations={locations} onAdded={(m) => reload(m)} />
        </div>
        {notices.length === 0 ? (
          <p style={{ border: `1px dashed ${C.border}`, borderRadius: '0.75rem', padding: '1.5rem', color: C.muted }}>{t('notices.empty')}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))', gap: '1rem', alignItems: 'start' }}>
            <ul style={{ display: 'grid', gap: '0.875rem', padding: 0, margin: 0 }}>
              {notices.map(n => <Card key={n.notice_id} notice={n} project={project} selected={n.notice_id === current?.notice_id} onSelect={() => setSelected(n.notice_id)} onChanged={(m) => reload(m)} />)}
            </ul>
            <Preview notice={current} project={project} />
          </div>
        )}
      </div>
    </main>
  );
}
