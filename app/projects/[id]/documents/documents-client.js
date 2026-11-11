'use client';
// SC-26 in the order of docs/screens/screen-spec-SC-26.md: title and segment (#3), A / B / C chips (#4, read-only view),
// groups by basis (#5–#7) with the awaiting label (Q1), template (#8), state (#9, the SC-27 labels), row actions (#10),
// differences by segment (#11), progress (#12) and the upload area (#13: client check, suggestion the user confirms,
// signed upload with progress, then record). Cards under 600 px.
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useT, useLocale } from '../../../../lib/i18n/client.js';
import { basisKey, stateKey, awaitingKey, templateView, progressView, uploadable } from '../../../../lib/documents/view.js';
import { checkUpload, suggestDocCode } from '../../../../lib/documents/input.js';

const C = { navy: '#0f2d52', blue: '#2563eb', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534', amber: '#92400e' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' };
const STATE_COLOR = { present: C.green, needs_fix: C.amber, pending: C.amber, missing: C.red };
const btn = { background: '#fff', color: C.navy, border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.3rem 0.6rem', font: 'inherit', fontSize: '0.8125rem', cursor: 'pointer' };
const primary = { ...btn, background: C.navy, color: '#fff', border: 'none', fontWeight: 600 };
const CSS = '@media(max-width:600px){.dk-row{grid-template-columns:1fr!important}}';
const date = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

function put(url, file, onProgress) {
  return new Promise((resolve) => {
    const x = new XMLHttpRequest();
    x.open('PUT', url);
    x.setRequestHeader('content-type', file.type);
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => resolve(x.status >= 200 && x.status < 300);
    x.onerror = () => resolve(false);
    x.send(file);
  });
}
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  .then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) })).catch(() => ({ status: 0, body: {} }));

export default function DocumentsClient({ projectId, projectName, kit }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [target, setTarget] = useState('');
  const [progress, setProgress] = useState(null);
  const [message, setMessage] = useState(null);
  const [drag, setDrag] = useState(false);

  if (!kit) {
    return (
      <main style={{ gridColumn: 'span 3', minWidth: 0 }}>
        <h1 style={{ fontSize: '1.5rem', color: C.navy }}>{t('documents.title')}</h1>
        <p role="alert" style={{ color: C.red }}>{t('documents.error.load')} <button type="button" onClick={() => router.refresh()} style={btn}>{t('documents.retry')}</button></p>
      </main>
    );
  }
  const rows = kit.groups.flatMap(g => g.rows);
  const targets = kit.editable ? rows.filter(uploadable) : [];
  const name = (r) => (locale === 'en' ? r.name_en : r.name_vi);
  const pv = progressView(kit.progress);

  function choose(f, forCode = null) {
    setMessage(null);
    if (!f) return;
    const check = checkUpload({ filename: f.name, content_type: f.type, size: f.size });
    if (!check.ok) { setFile(null); setMessage({ ok: false, text: t(Object.values(check.fields)[0]) + ' ' + t('documents.upload.limit') }); return; }
    setFile(f);
    setTarget(forCode || suggestDocCode(f.name, targets) || '');
  }
  async function upload() {
    if (!file || !target) return;
    setMessage(null);
    setProgress(0);
    const slot = await post(`/api/projects/${projectId}/documents/upload-url`, { doc_code: target, filename: file.name, content_type: file.type, size: file.size });
    const ok = slot.status === 200 && await put(slot.body.upload_url, file, setProgress);
    const rec = ok ? await post(`/api/projects/${projectId}/documents`, { doc_code: target, path: slot.body.path }) : null;
    setProgress(null);
    if (rec?.status === 201) {
      setFile(null); setTarget('');
      setMessage({ ok: true, text: t('documents.upload.done') });
      router.refresh();
    } else {
      const code = (rec || slot).body?.error;
      setMessage({ ok: false, text: code && code !== 'UPLOAD_MISSING' ? t(`checks.api.${code.toLowerCase()}`) : t('documents.upload.failed') });
    }
  }
  async function view(documentId) {
    const r = await fetch(`/api/documents/${documentId}/download`).then(x => (x.ok ? x.json() : null)).catch(() => null);
    if (r?.url) window.open(r.url, '_blank', 'noopener');
  }
  const action = (r, a) => {
    if (a === 'view') return <button key={a} type="button" style={btn} onClick={() => view(r.latest.document_id)}>{t('documents.action.view')}</button>;
    if (a === 'upload' || a === 'replace') return <button key={a} type="button" style={btn} onClick={() => { setTarget(r.doc_code); input.current?.click(); }}>{t(`documents.action.${a}`)}</button>;
    if (a === 'request') return <a key={a} href={`/requests?project=${projectId}`} style={{ color: C.blue, fontSize: '0.8125rem' }}>{t('documents.action.request')}</a>;
    if (a === 'notice' || a === 'notice_view') return <a key={a} href={`/projects/${projectId}/provinces`} style={{ color: C.blue, fontSize: '0.8125rem' }}>{t(`documents.action.${a}`)}</a>;
    return <a key={a} href={`/projects/${projectId}/bilingual/${r.doc_code}`} style={{ color: C.blue, fontSize: '0.8125rem' }}>{t('documents.action.draft')}</a>;
  };

  return (
    <main style={{ gridColumn: 'span 3', minWidth: 0, display: 'grid', gap: '1rem' }}>
      <style>{CSS}</style>
      <header>
        <h1 style={{ fontSize: '1.5rem', margin: 0, color: C.navy }}>{t('documents.title')} · {projectName}</h1>
        <p style={{ margin: '0.25rem 0 0', color: C.muted }}>{t('documents.segment', { segment: kit.segment })}</p>
      </header>
      <div role="group" aria-label={t('documents.chips')} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.875rem', color: C.muted }}>{t('documents.chips')}</span>
        {['A', 'B', 'C'].map(s => (
          <button key={s} type="button" aria-pressed={kit.viewing_segment === s} onClick={() => router.push(s === kit.segment ? `/projects/${projectId}/documents` : `/projects/${projectId}/documents?segment=${s}`)}
            style={{ ...btn, borderRadius: '999px', background: kit.viewing_segment === s ? C.navy : '#fff', color: kit.viewing_segment === s ? '#fff' : C.navy }}>{s}</button>
        ))}
      </div>
      {kit.viewing_segment !== kit.segment ? <p role="status" style={{ margin: 0, color: C.amber }}>{t('documents.viewing', { viewing: kit.viewing_segment, segment: kit.segment })}</p> : null}
      {message ? <p role={message.ok ? 'status' : 'alert'} style={{ margin: 0, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: message.ok ? '#ecfdf5' : '#fef2f2', color: message.ok ? C.green : C.red }}>{message.text}</p> : null}
      <section style={box} aria-labelledby="dk-progress">
        <h2 id="dk-progress" style={{ fontSize: '1rem', margin: 0 }}>{t('documents.progress', { present: pv.present, total: pv.total })}</h2>
        <div aria-hidden="true" style={{ height: '0.5rem', background: C.border, borderRadius: '0.25rem', marginTop: '0.5rem' }}><div style={{ width: `${pv.pct}%`, height: '100%', background: C.navy, borderRadius: '0.25rem' }} /></div>
        <a href={`/projects/${projectId}/dossier`} style={{ display: 'inline-block', marginTop: '0.5rem', color: C.blue, fontSize: '0.875rem' }}>{t('documents.progress.link')}</a>
      </section>
      {kit.groups.map(g => (
        <section key={g.basis} style={box} aria-labelledby={`dk-${g.basis}`}>
          <h2 id={`dk-${g.basis}`} style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t(basisKey(g.basis))}</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.5rem' }}>
            {g.rows.map(r => {
              const tpl = templateView(r.template_url);
              return (
                <li key={r.doc_code} id={r.doc_code} className="dk-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1.5fr)', gap: '0.5rem', borderTop: `1px solid ${C.border}`, paddingTop: '0.5rem' }}>
                  <div>
                    <strong>{name(r)}</strong>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: C.muted }}>{t(basisKey(r.basis))}{awaitingKey(r) ? <span style={{ color: C.amber }}> · {t(awaitingKey(r))}</span> : null}</span>
                    {tpl.href ? <a href={tpl.href} style={{ fontSize: '0.75rem', color: C.blue }}>{t('documents.template.download')}</a> : tpl.pendingKey ? <span style={{ fontSize: '0.75rem', color: C.muted }}>{t(tpl.pendingKey)}</span> : null}
                  </div>
                  <div style={{ color: STATE_COLOR[r.state], fontWeight: 600, fontSize: '0.875rem' }}>
                    {t(stateKey(r.state))}
                    {r.latest ? <span style={{ display: 'block', fontWeight: 400, color: C.muted, fontSize: '0.75rem' }}>{t('documents.version', { version: r.latest.version, date: date(r.latest.uploaded_at) })}{r.versions > 1 ? ` · ${t('documents.versions')}: ${r.versions}` : ''}</span> : null}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>{r.actions.map(a => action(r, a))}</div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {kit.location_note ? <p style={{ ...box, margin: 0, color: C.muted }}>{t('documents.location_note')}</p> : null}
      {kit.editable ? (
        <section style={box} aria-labelledby="dk-upload">
          <h2 id="dk-upload" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('documents.upload.area')}</h2>
          <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files?.[0], target || null); }}
            style={{ border: `2px dashed ${drag ? C.navy : C.border}`, borderRadius: '0.75rem', padding: '1rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 0.5rem', color: C.muted, fontSize: '0.875rem' }}>{t('documents.upload.limit')}</p>
            <button type="button" style={btn} onClick={() => input.current?.click()}>{t('documents.upload.choose')}</button>
            <input ref={input} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden
              onChange={(e) => { choose(e.target.files?.[0], target || null); e.target.value = ''; }} />
          </div>
          {file ? (
            <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem' }}>{file.name}</span>
              {target && suggestDocCode(file.name, targets) === target ? <span style={{ fontSize: '0.875rem', color: C.navy }}>{t('documents.upload.suggest', { document: name(rows.find(r => r.doc_code === target)) })}</span> : null}
              <label style={{ fontSize: '0.875rem' }}>{t('documents.upload.pick')}{' '}
                <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ font: 'inherit' }}>
                  <option value="">—</option>
                  {targets.map(r => <option key={r.doc_code} value={r.doc_code}>{name(r)}</option>)}
                </select>
              </label>
              {progress !== null ? <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={t('documents.upload.progress')} style={{ height: '0.5rem', background: C.border, borderRadius: '0.25rem' }}><div style={{ width: `${progress}%`, height: '100%', background: C.navy, borderRadius: '0.25rem' }} /></div> : null}
              <button type="button" onClick={upload} disabled={!target || progress !== null} style={{ ...primary, justifySelf: 'start', opacity: !target || progress !== null ? 0.6 : 1 }}>{t('documents.upload.confirm')}</button>
            </div>
          ) : null}
        </section>
      ) : null}
      <details style={box}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('documents.differences')}</summary>
        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.875rem' }}>
          {kit.differences.map(d => <li key={`${d.segment}-${d.requirement_code}`}><strong>{d.segment}</strong> · {locale === 'en' ? d.label_en : d.label_vi} — {t(d.needed ? 'documents.differences.needed' : 'documents.differences.not_needed')}</li>)}
        </ul>
      </details>
    </main>
  );
}
