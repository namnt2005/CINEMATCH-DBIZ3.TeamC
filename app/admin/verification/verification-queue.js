'use client';
// SC-36 in the order of docs/screens/screen-spec-SC-36.md: title and summary (#3), status chips (#4), list (#5),
// organisation header (#6), document (#7), references (#8), review guide (#9, not stored), Article 13 switch (#10),
// Approve with its preview (#11), reason + Reject (#12), audit note (#13). Every text from lib/i18n.
import { useState } from 'react';
import { useT } from '../../../lib/i18n/client.js';
import { approvalPreview, canReject, canSwitchArt13On, STATUS_TABS } from './queue-view.js';

const C = { navy: '#0f2d52', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' };
const button = { background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 0.9rem', font: 'inherit', fontWeight: 600, cursor: 'pointer' };
const ghost = { ...button, background: '#fff', color: C.navy, border: `1px solid ${C.border}` };
const vnDate = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
const post = async (url, body) => { const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null); return res?.ok ?? false; };

export default function VerificationQueue({ initial, provinces }) {
  const t = useT();
  const [queue, setQueue] = useState(initial);
  const [tab, setTab] = useState('pending');
  const [selected, setSelected] = useState(initial.requests[0]?.request_id ?? null);
  const [reason, setReason] = useState('');
  const [businessLine, setBusinessLine] = useState(false);
  const [message, setMessage] = useState(null);
  const [docError, setDocError] = useState(null);
  const current = queue.requests.find(r => r.request_id === selected) ?? null;
  const preview = approvalPreview(new Date());

  async function load(next = tab, keep = null) {
    const res = await fetch(`/api/admin/verification?status=${next}`).catch(() => null);
    if (!res?.ok) return;
    const body = await res.json();
    setQueue(body);
    setTab(next);
    setSelected(keep ?? body.requests[0]?.request_id ?? null);
  }
  async function decide(decision) {
    const ok = await post(`/api/admin/verification/${current.request_id}/decision`, decision === 'rejected' ? { decision, reason } : { decision });
    setMessage({ ok, text: t(ok ? 'queue.done' : 'queue.failed') });
    if (ok) { setReason(''); await load(tab); }
  }
  async function art13(on) {
    const ok = await post(`/api/admin/organisations/${current.org.org_id}/art13`, on ? { on, business_line_confirmed: businessLine } : { on });
    setMessage({ ok, text: t(ok ? 'queue.done' : 'queue.failed') });
    if (ok) { setBusinessLine(false); await load(tab, current.request_id); }
  }
  async function openDocument() {
    setDocError(null);
    const res = await fetch(`/api/admin/verification/${current.request_id}/document`).catch(() => null);
    if (res?.ok) window.open((await res.json()).url, '_blank', 'noopener');
    else setDocError(t('queue.document_missing'));
  }

  return (
    <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1rem' }}>
      <header>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{t('queue.title')}</h1>
        <p style={{ margin: '0.25rem 0 0', color: C.muted }}>{queue.counts.pending ? t('queue.summary', { n: queue.counts.pending, days: queue.oldest_pending_days ?? 0 }) : t('queue.summary_none')}</p>
      </header>
      <div role="tablist" style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
        {STATUS_TABS.map(s => (
          <button key={s} type="button" role="tab" aria-selected={tab === s} onClick={() => load(s)} style={tab === s ? button : ghost}>
            {t(`verification.status.${s}`)}{s !== 'all' ? ` (${queue.counts[s] ?? 0})` : ''}
          </button>
        ))}
      </div>
      {message ? <p role={message.ok ? 'status' : 'alert'} style={{ margin: 0, color: message.ok ? C.green : C.red }}>{message.text}</p> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))', gap: '1rem', alignItems: 'start' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.5rem' }}>
          {queue.requests.length === 0 ? <li style={{ ...box, color: C.muted }}>{t('queue.empty')}</li> : queue.requests.map(r => (
            <li key={r.request_id}>
              <button type="button" onClick={() => setSelected(r.request_id)} aria-current={r.request_id === selected ? 'true' : undefined}
                style={{ ...box, width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit', borderColor: r.request_id === selected ? C.navy : C.border }}>
                <strong>{r.org.org_name}</strong>
                <span style={{ display: 'block', fontSize: '0.8125rem', color: C.muted }}>{t(`verification.status.${r.status}`)} · {vnDate(r.decided_at || r.submitted_at)} · {provinces[r.org.hq_province] || '—'}</span>
              </button>
            </li>
          ))}
        </ul>
        {current ? (
          <section style={{ ...box, display: 'grid', gap: '0.75rem' }} aria-labelledby="detail">
            <h2 id="detail" style={{ fontSize: '1.125rem', margin: 0 }}>{current.org.org_name}</h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: C.muted }}>{t('queue.org_line', { legal_form: current.org.legal_form, province: provinces[current.org.hq_province] || '—', names: current.partner_names.join(', ') || '—' })}</p>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>{current.org.service_groups.map(g => t(`partners.group.${g}`)).join(' · ')}</p>
            <button type="button" style={{ ...ghost, justifySelf: 'start' }} onClick={openDocument}>{t('queue.open_document')}</button>
            {docError ? <p role="alert" style={{ margin: 0, color: C.red }}>{docError}</p> : null}
            <div>
              <strong style={{ fontSize: '0.875rem' }}>{t('queue.references')}</strong>
              <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>{current.reference_projects.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
            <fieldset style={{ border: `1px dashed ${C.border}`, borderRadius: '0.5rem', margin: 0, padding: '0.5rem 0.75rem' }}>
              <legend style={{ fontSize: '0.875rem' }}>{t('queue.guide')}</legend>
              {['valid', 'name', 'references'].map(k => <label key={k} style={{ display: 'block', fontSize: '0.875rem' }}><input type="checkbox" /> {t(`queue.guide.${k}`)}</label>)}
            </fieldset>
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
              <strong>{t('queue.art13')}: {current.org.art13_eligible ? '✓' : '—'}</strong>
              {!current.org.art13_eligible ? (
                <>
                  <label style={{ fontSize: '0.875rem' }}><input type="checkbox" checked={businessLine} onChange={e => setBusinessLine(e.target.checked)} /> {t('queue.art13_confirm')}</label>
                  <button type="button" style={{ ...ghost, justifySelf: 'start', opacity: canSwitchArt13On(businessLine) ? 1 : 0.5 }} disabled={!canSwitchArt13On(businessLine)} onClick={() => art13(true)}>{t('queue.art13_on')}</button>
                </>
              ) : <button type="button" style={{ ...ghost, justifySelf: 'start' }} onClick={() => art13(false)}>{t('queue.art13_off')}</button>}
            </div>
            {current.status === 'pending' ? (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>{t('queue.approve_preview', { from: vnDate(preview.from), until: vnDate(preview.until) })}</p>
                <button type="button" style={{ ...button, justifySelf: 'start' }} onClick={() => decide('approved')}>{t('queue.approve')}</button>
                <label style={{ fontSize: '0.875rem' }}>{t('queue.reason')}
                  <textarea rows={3} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.25rem', padding: '0.5rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', font: 'inherit' }} />
                </label>
                <button type="button" style={{ ...button, background: C.red, justifySelf: 'start', opacity: canReject(reason) ? 1 : 0.5 }} disabled={!canReject(reason)} onClick={() => decide('rejected')}>{t('queue.reject')}</button>
              </div>
            ) : current.reason ? <p style={{ margin: 0 }}>{current.reason}</p> : null}
            <p style={{ margin: 0, fontSize: '0.75rem', color: C.muted }}>{t('queue.audit_note')}</p>
          </section>
        ) : <p style={{ ...box, color: C.muted }}>{t('queue.select')}</p>}
      </div>
    </main>
  );
}
