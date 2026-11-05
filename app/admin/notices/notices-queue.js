'use client';
// SC-32, VFDA side: tabs by review state, the letter as the crew will download it, Approve / Request changes
// (a note is required), and on approved letters already downloaded, the province's reply (M7 D3, BR-003).
// Every review writes one audit_log row on the server. Every text from lib/i18n.
import { useState } from 'react';
import { useLocale, useT } from '../../../lib/i18n/client.js';
import { buildLetter } from '../../../lib/notices/letter.js';
import { staffTabs, replyLine, REPLY_CHOICES, formatDate } from '../../projects/[id]/provinces/provinces-view.js';

const C = { navy: '#0f2d52', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534', amber: '#92400e' };
const button = { background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 0.875rem', font: 'inherit', fontWeight: 600, cursor: 'pointer' };
const ghost = { ...button, background: '#fff', color: C.navy, border: `1px solid ${C.border}` };
const field = { display: 'block', width: '100%', padding: '0.5rem 0.625rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', font: 'inherit', boxSizing: 'border-box' };

async function send(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
  return { res, body: res ? await res.json().catch(() => ({})) : {} };
}

function Row({ notice, onDone }) {
  const t = useT();
  const locale = useLocale();
  const [mode, setMode] = useState(null);
  const [note, setNote] = useState('');
  const [reply, setReply] = useState({ response: '', note: '' });
  const [failed, setFailed] = useState(null);
  const [busy, setBusy] = useState(false);
  const letter = buildLetter({ projectName: notice.project_name, provinceName: notice.province.name, summary: notice.summary }, notice.recipient || 'peoples_committee');
  const names = notice.locations.map(l => (locale === 'vi' ? l.name_vi : l.name_en)).join(', ');
  const line = replyLine(notice);

  async function review(decision) {
    if (decision === 'request_changes' && !note.trim()) { setFailed(t('notices.error.note_required')); return; }
    setBusy(true);
    const { res, body } = await send(`/api/admin/notices/${notice.notice_id}/review`, decision === 'approve' ? { decision } : { decision, note });
    setBusy(false);
    if (res?.ok) onDone(t(decision === 'approve' ? 'notices.staff.done_approve' : 'notices.staff.done_changes'));
    else setFailed(body.fields?.note ? t(body.fields.note) : t('notices.staff.failed'));
  }
  async function saveReply(e) {
    e.preventDefault();
    setBusy(true);
    const { res } = await send(`/api/notices/${notice.notice_id}/reply`, { response: reply.response, note: reply.note || undefined });
    setBusy(false);
    if (res?.ok) onDone(t('notices.reply_saved'));
    else setFailed(t('notices.staff.failed'));
  }

  return (
    <li style={{ listStyle: 'none', border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' }}>
      <strong>{t('notices.staff.project', { project: notice.project_name, province: notice.province.name })}</strong>
      <span style={{ display: 'block', color: C.muted, fontSize: '0.8125rem' }}>{t('notices.locations', { names })}</span>
      {notice.review_note && notice.review_status === 'changes_requested' ? <p style={{ color: C.amber, fontSize: '0.875rem' }}><strong>{t('notices.action.changes')}</strong> {notice.review_note}</p> : null}
      <details style={{ margin: '0.625rem 0' }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.875rem' }}>{t('notices.preview')}</summary>
        {letter.paragraphs.map((p, i) => <p key={i} lang={p.lang} style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>{p.text}</p>)}
      </details>
      {failed ? <p role="alert" style={{ color: C.red, fontSize: '0.875rem' }}>{failed}</p> : null}
      {notice.review_status === 'submitted' ? (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {mode === 'changes' ? (
            <label style={{ fontSize: '0.8125rem' }}>{t('notices.staff.note')}
              <textarea rows={3} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} style={{ ...field, marginTop: '0.25rem' }} />
            </label>
          ) : null}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" style={button} disabled={busy} onClick={() => review('approve')}>{t('notices.staff.approve')}</button>
            <button type="button" style={ghost} disabled={busy} onClick={() => (mode === 'changes' ? review('request_changes') : setMode('changes'))}>{t('notices.staff.request_changes')}</button>
          </div>
        </div>
      ) : null}
      {notice.review_status === 'approved' ? (
        <>
          <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}>
            {notice.sent_at ? t('notices.sent_hint', { date: formatDate(notice.sent_at) }) : t('notices.action.waiting_download')}
          </p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.875rem' }}><strong>{t('notices.reply.label')}:</strong> {t(line.status)}{line.date ? ` · ${t('notices.reply.on', { date: line.date })}` : ''}</p>
          {notice.sent_at ? (
            <form onSubmit={saveReply} style={{ marginTop: '0.5rem' }}>
              <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t('notices.action.reply')}</legend>
                {REPLY_CHOICES.map(r => (
                  <label key={r} style={{ display: 'block', fontSize: '0.875rem' }}>
                    <input type="radio" name={`staff-reply-${notice.notice_id}`} value={r} checked={reply.response === r} onChange={() => setReply(x => ({ ...x, response: r }))} /> {t(`notices.reply.${r}`)}
                  </label>
                ))}
              </fieldset>
              <label style={{ display: 'block', fontSize: '0.8125rem', marginTop: '0.5rem' }}>{t('notices.action.reply_note')}
                <textarea rows={2} maxLength={2000} value={reply.note} onChange={e => setReply(x => ({ ...x, note: e.target.value }))} style={{ ...field, marginTop: '0.25rem' }} />
              </label>
              <button type="submit" style={{ ...button, marginTop: '0.5rem', opacity: reply.response ? 1 : 0.5 }} disabled={!reply.response || busy}>{t('notices.action.reply_save')}</button>
            </form>
          ) : null}
        </>
      ) : null}
    </li>
  );
}

export default function NoticesQueue({ initialNotices }) {
  const t = useT();
  const [status, setStatus] = useState('submitted');
  const [notices, setNotices] = useState(initialNotices);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load(next, done) {
    setLoading(true);
    const res = await fetch(`/api/admin/notices?status=${next}`).catch(() => null);
    setLoading(false);
    if (!res?.ok) { setError(true); return; }
    setError(false);
    setStatus(next);
    setNotices((await res.json()).notices);
    setMessage(done ?? null);
  }

  return (
    <main style={{ maxWidth: '960px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.625rem', margin: 0 }}>{t('notices.staff.title')}</h1>
      <p style={{ margin: '0.25rem 0 1rem', color: C.muted }}>{t('notices.staff.purpose')}</p>
      <div role="tablist" style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {staffTabs(status).map(tab => (
          <button key={tab.status} type="button" role="tab" aria-selected={tab.active} onClick={() => load(tab.status)}
            style={tab.active ? button : ghost}>{t(`notices.tab.${tab.status}`)}</button>
        ))}
      </div>
      {message ? <p role="status" style={{ background: '#f0fdf4', color: C.green, padding: '0.625rem 0.875rem', borderRadius: '0.5rem' }}>{message}</p> : null}
      {error ? <p role="alert" style={{ color: C.red }}>{t('notices.staff.failed')}</p> : null}
      {loading ? <p aria-busy="true" style={{ color: C.muted }}>…</p> : notices.length === 0 ? (
        <p style={{ border: `1px dashed ${C.border}`, borderRadius: '0.75rem', padding: '1.5rem', color: C.muted }}>{t('notices.staff.empty')}</p>
      ) : (
        <ul style={{ display: 'grid', gap: '0.875rem', padding: 0, margin: 0 }}>
          {notices.map(n => <Row key={n.notice_id} notice={n} onDone={(m) => load(status, m)} />)}
        </ul>
      )}
    </main>
  );
}
