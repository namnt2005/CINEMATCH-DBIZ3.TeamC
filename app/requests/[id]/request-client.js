'use client';
// SC-25 in the order of docs/screens/screen-spec-SC-25.md: status (#4), the five-step bar (#5, D7), summary (#6),
// message thread (#7), partner response card (#8), NDA box (#9), Confirm (#10), partner buttons (#11), composer (#12)
// and the consequences note (#13). The server checks every action again (BR-005). Every text from lib/i18n.
import { useState } from 'react';
import { useT } from '../../../lib/i18n/client.js';
import { stepper, endState, buttons, composerValid, showWithdrawHint, CONSEQUENCE_KEY, MESSAGE_MAX } from '../request-view.js';

const C = { navy: '#0f2d52', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534', amber: '#92400e' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' };
const button = { background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 0.9rem', font: 'inherit', fontWeight: 600, cursor: 'pointer' };
const ghost = { ...button, background: '#fff', color: C.navy, border: `1px solid ${C.border}` };
const vnDate = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) }).catch(() => null);
  return { ok: Boolean(res?.ok), body: res ? await res.json().catch(() => ({})) : {} };
}

export default function RequestClient({ initial, viewer }) {
  const t = useT();
  const [r, setR] = useState(initial);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [partnerNda, setPartnerNda] = useState(false);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const ui = buttons(r);
  const ended = endState(r);

  async function reload() {
    const res = await fetch(`/api/requests/${r.request_id}`).catch(() => null);
    if (res?.ok) setR(await res.json());
  }
  async function act(path, body) {
    setBusy(true);
    const out = await post(`/api/requests/${r.request_id}/${path}`, body);
    setBusy(false);
    setStatus(out.ok ? { ok: true, text: t('requests.saved') } : { ok: false, text: out.body.error ? t(`partners.api.${String(out.body.error).toLowerCase()}`) : t('requests.failed') });
    if (out.ok) await reload();
    return out.ok;
  }

  return (
    <main style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1rem' }}>
      <nav style={{ fontSize: '0.875rem' }}>
        <a href={viewer === 'partner' ? '/requests' : `/requests?project=${r.project.project_id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{t('requests.title')}</a>
        {' · '}<a href={`/partners/${r.organisation.slug}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{t('requests.view_partner')}</a>
      </nav>
      <header>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{viewer === 'partner' ? r.project.project_name : r.organisation.org_name}</h1>
        <p style={{ margin: '0.25rem 0 0', fontWeight: 600 }}>{t(`requests.status.${r.status}`)}</p>
      </header>

      {ended ? <p role="status" style={{ ...box, color: C.amber }}>{t('requests.end_state', { status: t(`requests.status.${ended}`) })}</p> : (
        <ol aria-label={t('requests.title')} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {stepper(r).map((s, i) => (
            <li key={s.key} aria-current={s.state === 'current' ? 'step' : undefined}
              style={{ fontSize: '0.8125rem', padding: '0.3rem 0.65rem', borderRadius: '1rem', border: `1px solid ${s.state === 'done' ? C.green : C.border}`, color: s.state === 'done' ? C.green : s.state === 'current' ? C.navy : C.muted, fontWeight: s.state === 'current' ? 700 : 400 }}>
              {s.state === 'done' ? '✓ ' : ''}{i + 1}. {t(`requests.step.${s.key}`)}
            </li>
          ))}
        </ol>
      )}

      <section style={box} aria-labelledby="summary">
        <h2 id="summary" style={{ fontSize: '1rem', margin: '0 0 0.375rem' }}>{t('requests.summary')}</h2>
        <p style={{ margin: 0 }}>{t('requests.project_line', { project: r.project.project_name, date: vnDate(r.project.shoot_date) || '—' })}</p>
        <p style={{ margin: '0.25rem 0 0' }}>{t('requests.services', { list: r.services.map(g => t(`partners.group.${g}`)).join(', ') })}</p>
        <p style={{ margin: '0.25rem 0 0', color: C.muted, fontSize: '0.875rem' }}>{t('requests.sent_at', { date: vnDate(r.sent_at) })}</p>
        {r.note ? <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap' }}>{r.note}</p> : null}
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>{t(`requests.component_c.${r.component_c}`)}</p>
      </section>

      {showWithdrawHint(r) && ui.withdraw ? <p role="note" style={{ ...box, background: '#fdf3dc', color: C.amber }}>{t('requests.withdraw_hint')}</p> : null}

      <section style={box} aria-labelledby="response">
        <h2 id="response" style={{ fontSize: '1rem', margin: '0 0 0.375rem' }}>{t('requests.response_card')}</h2>
        {r.responded_at ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{r.response_note || t(`requests.status.${r.status}`)}</p> : <p style={{ margin: 0, color: C.muted }}>{t('requests.waiting')}</p>}
        {r.nda.producer && r.nda.partner ? <p style={{ margin: '0.5rem 0 0', color: C.green }}>{t('requests.nda_done')}</p> : null}
      </section>

      {ui.partner ? (
        <section style={{ ...box, display: 'grid', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem' }}>{t('requests.respond.note')}
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} maxLength={MESSAGE_MAX} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.25rem', padding: '0.5rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', font: 'inherit' }} />
          </label>
          <label style={{ fontSize: '0.875rem' }}>
            <input type="checkbox" checked={partnerNda} onChange={e => setPartnerNda(e.target.checked)} /> {t('requests.respond.nda_box', { version: r.nda.version })}
          </label>
          <a href="/legal/nda" target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '0.8125rem' }}>{t('requests.nda_link')}</a>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" style={button} disabled={busy || !partnerNda} onClick={() => act('respond', { decision: 'accepted', nda_accepted: true, note })}>{t('requests.respond.accepted')}</button>
            {['under_review', 'info_requested', 'declined'].map(d => (
              <button key={d} type="button" style={ghost} disabled={busy} onClick={() => act('respond', { decision: d, note })}>{t(`requests.respond.${d}`)}</button>
            ))}
          </div>
        </section>
      ) : null}

      {ui.ndaBox || ui.confirm !== 'hidden' || ui.withdraw ? (
        <section style={{ ...box, display: 'grid', gap: '0.5rem' }}>
          {ui.ndaBox ? (
            <>
              <label style={{ fontSize: '0.875rem' }}>
                <input type="checkbox" checked={false} disabled={busy} onChange={() => act('nda', { nda_version: r.nda.version, accepted: true })} /> {t('requests.nda_box', { version: r.nda.version })}
              </label>
              <a href="/legal/nda" target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '0.8125rem' }}>{t('requests.nda_link')}</a>
            </>
          ) : null}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {ui.confirm !== 'hidden' ? <button type="button" style={{ ...button, opacity: ui.confirm === 'enabled' ? 1 : 0.5 }} disabled={ui.confirm !== 'enabled' || busy} onClick={() => act('confirm')}>{t('requests.confirm')}</button> : null}
            {ui.withdraw ? <button type="button" style={ghost} disabled={busy} onClick={() => act('withdraw', {})}>{t('requests.withdraw')}</button> : null}
          </div>
          {ui.confirm !== 'hidden' ? <p style={{ margin: 0, fontSize: '0.8125rem', color: C.muted }}>{t(CONSEQUENCE_KEY)}</p> : null}
        </section>
      ) : null}

      {status ? <p role={status.ok ? 'status' : 'alert'} style={{ margin: 0, color: status.ok ? C.green : C.red }}>{status.text}</p> : null}

      <section style={box} aria-labelledby="thread">
        <h2 id="thread" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('requests.thread')}</h2>
        {r.messages.length === 0 ? <p style={{ margin: 0, color: C.muted }}>{t('requests.no_messages')}</p> : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.5rem' }}>
            {r.messages.map(m => (
              <li key={m.message_id} style={{ background: m.author === 'partner' ? '#f5f8fc' : '#f9fafb', borderRadius: '0.5rem', padding: '0.5rem 0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: C.muted }}>{t(`requests.author.${m.author}`)}{m.author_name ? ` · ${m.author_name}` : ''} · {vnDate(m.created_at)}</span>
                <p style={{ margin: '0.25rem 0 0', whiteSpace: 'pre-wrap' }}>{m.body}</p>
              </li>
            ))}
          </ul>
        )}
        {r.can.message ? (
          <form onSubmit={async (e) => { e.preventDefault(); if (composerValid(message) && await act('messages', { body: message })) setMessage(''); }} style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem' }}>{t('requests.composer')}
              <textarea rows={3} value={message} maxLength={MESSAGE_MAX} onChange={e => setMessage(e.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.25rem', padding: '0.5rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', font: 'inherit' }} />
            </label>
            <button type="submit" style={{ ...button, justifySelf: 'start', opacity: composerValid(message) ? 1 : 0.5 }} disabled={!composerValid(message) || busy}>{t('requests.send_message')}</button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
