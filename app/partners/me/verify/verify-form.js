'use client';
// SC-22 in the order of docs/screens/screen-spec-SC-22.md: title (#2), organisation summary (#3), PDF (#4), references
// (#5, #6), checklist (#7), Submit (#8), Cancel (#9), what VFDA checks — and does not (#10), after you submit (#11),
// history (#12). The file is uploaded straight to Storage with a signed URL; the server checks it (R10).
import { useState } from 'react';
import { useT } from '../../../../lib/i18n/client.js';
import { checklist, canSubmit, CHECKS_KEYS } from '../partner-view.js';

const C = { navy: '#0f2d52', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff', display: 'grid', gap: '0.625rem' };
const field = { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.25rem', padding: '0.5rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', font: 'inherit' };
const vnDate = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');

export default function VerifyForm({ org, initial }) {
  const t = useT();
  const [history, setHistory] = useState(initial);
  const [file, setFile] = useState(null);
  const [refs, setRefs] = useState(['', '']);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const pending = Boolean(history.current);
  const state = { file, references: refs, pending };
  const list = checklist(state);

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit(state)) return;
    setBusy(true);
    setStatus(null);
    const post = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    const up = await post('/api/partners/me/verification/upload', { size: file.size, content_type: file.type });
    const slot = up?.ok ? await up.json() : null;
    const put = slot ? await fetch(slot.upload_url, { method: 'PUT', headers: { 'content-type': 'application/pdf' }, body: file }).catch(() => null) : null;
    const res = put?.ok ? await post('/api/partners/me/verification', { path: slot.path, reference_projects: refs }) : null;
    setBusy(false);
    if (res?.status === 201) {
      setStatus({ ok: true, text: t('verification.submitted') });
      const next = await fetch('/api/partners/me/verification').then(r => (r.ok ? r.json() : null)).catch(() => null);
      if (next) setHistory(next);
    } else setStatus({ ok: false, text: t('verification.failed') });
  }

  return (
    <main style={{ maxWidth: '820px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1rem' }}>
      <nav style={{ fontSize: '0.875rem' }}><a href="/partners/me" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('org.title')}</a> › {t('verification.title')}</nav>
      <header>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{t('verification.title')}</h1>
        <p style={{ margin: '0.25rem 0 0', color: C.muted }}>{t('verification.purpose')}</p>
      </header>
      <section style={box}>
        <strong>{org.org_name}</strong>
        <span style={{ fontSize: '0.875rem', color: C.muted }}>{org.legal_form} · {org.service_groups.map(g => t(`partners.group.${g}`)).join(' · ')}</span>
      </section>
      {pending ? <p role="status" style={{ ...box, display: 'block', background: '#f5f8fc' }}>{t('verification.pending_readonly')}</p> : null}
      <form onSubmit={submit} style={box}>
        <label>{t('verification.file')}
          <input type="file" accept="application/pdf" disabled={pending || busy} onChange={e => setFile(e.target.files?.[0] || null)} style={field} />
        </label>
        <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.5rem' }}>
          <legend>{t('verification.references')}</legend>
          {refs.map((r, i) => (
            <label key={i} style={{ fontSize: '0.875rem' }}>{t('verification.reference_n', { n: i + 1 })}
              <input value={r} maxLength={200} disabled={pending || busy} onChange={e => setRefs(list => list.map((x, j) => (j === i ? e.target.value : x)))} style={field} />
            </label>
          ))}
          {refs.length < 10 ? <button type="button" disabled={pending || busy} onClick={() => setRefs(list => [...list, ''])} style={{ justifySelf: 'start', background: '#fff', border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.35rem 0.75rem', font: 'inherit', color: C.navy }}>{t('verification.add_reference')}</button> : null}
        </fieldset>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '0.875rem' }}>
          {Object.entries(list).map(([k, done]) => <li key={k} style={{ color: done ? C.green : C.muted }}>{done ? '✓' : '○'} {t(`verification.checklist.${k}`)}</li>)}
        </ul>
        {status ? <p role={status.ok ? 'status' : 'alert'} style={{ margin: 0, color: status.ok ? C.green : C.red }}>{status.text}</p> : null}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button type="submit" disabled={!canSubmit(state) || busy} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.55rem 1rem', font: 'inherit', fontWeight: 600, opacity: canSubmit(state) && !busy ? 1 : 0.5 }}>
            {t(busy ? 'verification.sending' : 'verification.submit')}
          </button>
          <a href="/partners/me" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('verification.cancel')}</a>
        </div>
      </form>
      <section style={box} aria-labelledby="checks">
        <h2 id="checks" style={{ fontSize: '1rem', margin: 0 }}>{t(CHECKS_KEYS[0])}</h2>
        {CHECKS_KEYS.slice(1).map(k => <p key={k} style={{ margin: 0 }}>{t(k)}</p>)}
        <p style={{ margin: 0, fontSize: '0.75rem', color: C.muted }}>{t('partners.checked.draft')}</p>
      </section>
      <section style={box} aria-labelledby="after">
        <h2 id="after" style={{ fontSize: '1rem', margin: 0 }}>{t('verification.after')}</h2>
        <p style={{ margin: 0 }}>{t('verification.after_steps')}</p>
      </section>
      <section style={box} aria-labelledby="history">
        <h2 id="history" style={{ fontSize: '1rem', margin: 0 }}>{t('verification.history')}</h2>
        {history.history.length === 0 ? <p style={{ margin: 0, color: C.muted }}>{t('org.verification.none')}</p> : (
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {history.history.map(h => (
              <li key={h.request_id}>
                {t('verification.history_row', { status: t(`verification.status.${h.status}`), submitted: vnDate(h.submitted_at), decided: h.decided_at ? t('verification.decided_on', { date: vnDate(h.decided_at) }) : '' })}
                {h.reason ? <span style={{ display: 'block', color: C.muted }}>{h.reason}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
