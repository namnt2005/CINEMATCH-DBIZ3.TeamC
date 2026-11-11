'use client';
// SC-28 in the order of docs/screens/screen-spec-SC-28.md: document picker (#3), progress (#4), English source (#5) and
// Vietnamese column (#6, autosave 2 s, lang="vi"), status (#7, A1), ✓ Proofread (#8) and Confirm whole document (D4),
// glossary (#9, mismatches highlighted), DRAFT / green strip (#10), PDF (#11), Save (#12), sync scroll (#13).
// Empty state: paste or .docx (4 MB), the consent box only with the paid plan (Q3). One column below 768 px.
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useT, useLocale } from '../../../../../lib/i18n/client.js';
import { progressView, stripView, statusView, canMarkProofread, showConfirm, consentVisible, mismatchVars } from '../../../../../lib/drafts/view.js';
import { splitParagraphs } from '../../../../../lib/drafts/paragraphs.js';

const C = { navy: '#0f2d52', blue: '#2563eb', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534', amber: '#92400e' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' };
const btn = { background: '#fff', color: C.navy, border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.3rem 0.6rem', font: 'inherit', fontSize: '0.8125rem', cursor: 'pointer' };
const primary = { ...btn, background: C.navy, color: '#fff', border: 'none', fontWeight: 600 };
const CSS = '@media(max-width:767px){.bd-row{grid-template-columns:1fr!important}.bd-panes{grid-template-columns:1fr!important}}';
const SYNC_KEY = 'cinematch.sc28.sync';

async function send(url, method, body) {
  const init = { method };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) { init.headers = { 'content-type': 'application/json' }; init.body = JSON.stringify(body); }
  const res = await fetch(url, init).catch(() => null);
  return { status: res?.status ?? 0, body: res ? await res.json().catch(() => ({})) : {} };
}

export default function DraftEditor({ projectId, docCode, projectName, draft: initial, drafts, choices }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const base = `/api/projects/${projectId}/drafts/${docCode}`;
  const [draft, setDraft] = useState(initial);
  const [texts, setTexts] = useState(() => Object.fromEntries(initial.paragraphs.map(p => [p.idx, p.target_text])));
  const [saving, setSaving] = useState({});
  const [failed, setFailed] = useState([]);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(null);
  const [source, setSource] = useState('');
  const [consent, setConsent] = useState(false);
  const [term, setTerm] = useState({ term_en: '', term_vi: '' });
  const [sync, setSync] = useState(true);
  const timers = useRef({});
  const docx = useRef(null);

  useEffect(() => { try { const v = window.localStorage.getItem(SYNC_KEY); if (v !== null) setSync(v === 'true'); } catch {} }, []);
  const toggleSync = () => { setSync(s => { try { window.localStorage.setItem(SYNC_KEY, String(!s)); } catch {} return !s; }); };

  async function reload() {
    const r = await send(base, 'GET');
    if (r.status === 200) { setDraft(r.body); setTexts(Object.fromEntries(r.body.paragraphs.map(p => [p.idx, p.target_text]))); }
  }
  async function save(idx, text) {
    setSaving(s => ({ ...s, [idx]: 'saving' }));
    const r = await send(`${base}/paragraphs/${idx}`, 'PATCH', { target_text: text });
    setSaving(s => ({ ...s, [idx]: r.status === 200 ? 'saved' : 'error' }));
    if (r.status === 200) setDraft(d => ({ ...d, paragraphs: d.paragraphs.map(p => (p.idx === idx ? { ...p, target_text: text.trim(), status: 'machine', reviewed_by_name: null, reviewer_org_name: null, reviewed_at: null } : p)) }));
  }
  function type(idx, text) {
    setTexts(x => ({ ...x, [idx]: text }));
    clearTimeout(timers.current[idx]);
    timers.current[idx] = setTimeout(() => save(idx, text), 2000);              // autosave after 2 s without typing
  }
  async function flush() {
    const pending = Object.keys(timers.current);
    for (const k of pending) { clearTimeout(timers.current[k]); delete timers.current[k]; await save(Number(k), texts[k] ?? ''); }
  }
  async function proofread(idx) {
    await flush();
    const r = await send(`${base}/paragraphs/${idx}/review`, 'POST', {});
    if (r.status === 200) await reload(); else setMessage({ ok: false, text: t(`checks.api.${String(r.body.error || 'not_found').toLowerCase()}`) });
  }
  async function confirmAll() {
    if (!window.confirm(t('drafts.confirm.ask'))) return;
    await flush();
    const r = await send(`${base}/confirm`, 'POST', {});
    if (r.status === 200) { setMessage({ ok: true, text: t('drafts.confirm.done') }); await reload(); }
    else setMessage({ ok: false, text: t(`checks.api.${String(r.body.error || 'forbidden').toLowerCase()}`) });
  }
  async function create(fromFile) {
    if (draft.exists && !window.confirm(t('drafts.recreate.ask'))) return;
    setMessage(null);
    let body;
    if (fromFile) { body = new FormData(); body.append('file', fromFile); body.append('consent', String(consent)); }
    else body = { text: source, consent };
    setBusy('create');
    const r = await send(base, 'POST', body);
    setBusy(null);
    if (r.status === 201) { setFailed(r.body.failed || []); setSource(''); await reload(); }
    else setMessage({ ok: false, text: t(r.body.fields ? Object.values(r.body.fields)[0] : `checks.api.${String(r.body.error || 'validation_error').toLowerCase()}`) });
  }
  async function retry(idx) {
    const r = await send(`${base}/translate`, 'POST', { idx, consent });
    if (r.status === 200) { setFailed(f => f.filter(x => x !== idx || r.body.failed.includes(idx))); await reload(); }
    else setMessage({ ok: false, text: t(`checks.api.${String(r.body.error || 'translation_unavailable').toLowerCase()}`) });
  }
  async function exportPdf() {
    await flush();
    setBusy('pdf');
    const r = await send(`${base}/pdf`, 'POST', {});
    setBusy(null);
    if (r.status === 200 && r.body.url) window.open(r.body.url, '_blank', 'noopener');
    else setMessage({ ok: false, text: t('drafts.error.load') });
  }
  async function addTerm(e) {
    e.preventDefault();
    const r = await send(`/api/projects/${projectId}/glossary`, 'POST', term);
    if (r.status === 201) { setTerm({ term_en: '', term_vi: '' }); await reload(); }
    else setMessage({ ok: false, text: t(r.body.fields?.term || 'glossary.error.term') });
  }
  async function removeTerm(en) {
    const r = await send(`/api/projects/${projectId}/glossary/${encodeURIComponent(en)}`, 'DELETE');
    if (r.status === 204 || r.status === 0) await reload();
  }

  const rights = { can_proofread: draft.can_proofread, can_confirm: draft.can_confirm };
  const paras = draft.paragraphs.map(p => ({ ...p, target_text: texts[p.idx] ?? p.target_text }));
  const pv = progressView(paras);
  const strip = stripView(paras);
  const name = (r) => (locale === 'en' ? r.name_en : r.name_vi);
  const mismatched = new Set(draft.mismatches || []);
  const termsFor = (p) => (draft.glossary || []).filter(g => p.source_text.toLowerCase().includes(g.term_en.toLowerCase()) && !String(p.target_text).toLowerCase().includes(g.term_vi.toLowerCase()));
  const pasteCount = splitParagraphs(source).length;

  const intake = (
    <section style={box} aria-labelledby="bd-intake">
      <h2 id="bd-intake" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{draft.exists ? t('drafts.recreate') : t('drafts.empty.title')}</h2>
      <label style={{ display: 'block', fontSize: '0.875rem' }}>{t('drafts.empty.paste')}
        <textarea lang="en" rows={8} value={source} onChange={(e) => setSource(e.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.25rem', font: 'inherit' }} />
      </label>
      <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>{t('drafts.empty.docx')}{' '}
        <input ref={docx} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) create(f); }} />
      </p>
      {consentVisible(draft.translation) ? <label style={{ display: 'block', fontSize: '0.875rem', margin: '0.5rem 0' }}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> {t('drafts.consent')}</label> : null}
      {draft.translation.mode === 'none' ? <p style={{ margin: '0.5rem 0', fontSize: '0.8125rem', color: C.muted }}>{t('drafts.no_machine')}</p> : null}
      {draft.translation.mode === 'mock' ? <p style={{ margin: '0.5rem 0', fontSize: '0.8125rem', color: C.amber }}>{t('drafts.mock')}</p> : null}
      <button type="button" style={{ ...primary, opacity: pasteCount && !busy ? 1 : 0.6 }} disabled={!pasteCount || Boolean(busy)} onClick={() => create(null)}>
        {busy === 'create' ? t('drafts.translating', { n: '…', total: pasteCount }) : t('drafts.create')}
      </button>
    </section>
  );

  return (
    <main style={{ display: 'grid', gap: '1rem', minWidth: 0 }}>
      <style>{CSS}</style>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0, color: C.navy }}>{t('drafts.title')}</h1>
          {projectName ? <p style={{ margin: '0.25rem 0 0', color: C.muted }}>{projectName}</p> : null}
        </div>
        <label style={{ fontSize: '0.875rem' }}>{t('drafts.picker')}{' '}
          <select value={docCode} onChange={(e) => router.push(`/projects/${projectId}/bilingual/${e.target.value}`)} style={{ font: 'inherit' }}>
            {[...drafts, ...choices.filter(c => !drafts.some(d => d.doc_code === c.doc_code))].map(d => <option key={d.doc_code} value={d.doc_code}>{name(d)}</option>)}
            {!drafts.some(d => d.doc_code === docCode) && !choices.some(c => c.doc_code === docCode) ? <option value={docCode}>{docCode}</option> : null}
          </select>
        </label>
      </header>
      {message ? <p role={message.ok ? 'status' : 'alert'} style={{ margin: 0, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: message.ok ? '#ecfdf5' : '#fef2f2', color: message.ok ? C.green : C.red }}>{message.text}</p> : null}
      {!draft.exists ? (draft.can_edit ? intake : <p style={box}>{t('drafts.not_found')}</p>) : (
        <>
          <p role="status" style={{ margin: 0, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontWeight: 600, background: strip.ok ? '#ecfdf5' : '#fef2f2', color: strip.ok ? C.green : C.red }}>
            {t(strip.key, strip.vars)}{strip.ok ? <> <a href={`/projects/${projectId}/dossier`} style={{ color: C.blue, fontWeight: 400 }}>{t('drafts.strip.link')}</a></> : null}
          </p>
          <section style={{ ...box, display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: '1 1 16rem' }}>
              <strong>{t('drafts.progress', { reviewed: pv.reviewed, total: pv.total })}</strong>
              <div aria-hidden="true" style={{ height: '0.5rem', background: C.border, borderRadius: '0.25rem', marginTop: '0.4rem' }}><div style={{ width: `${pv.pct}%`, height: '100%', background: pv.complete ? C.green : C.navy, borderRadius: '0.25rem' }} /></div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" style={btn} onClick={flush}>{t('drafts.save')}</button>
              {showConfirm(rights, paras) ? <button type="button" style={primary} onClick={confirmAll}>{t('drafts.confirm')}</button> : null}
              {draft.can_edit ? <button type="button" style={primary} onClick={exportPdf} disabled={busy === 'pdf'}>{busy === 'pdf' ? t('drafts.exporting') : t('drafts.export')}</button> : null}
              <label style={{ fontSize: '0.8125rem', alignSelf: 'center' }}><input type="checkbox" checked={sync} onChange={toggleSync} /> {t('drafts.sync')}</label>
            </div>
          </section>
          <div className="bd-panes" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(14rem, 18rem)', gap: '1rem', alignItems: 'start' }}>
            <section aria-label={t('drafts.col.target')} style={{ ...box, padding: 0, ...(sync ? {} : { maxHeight: '75vh', overflow: 'auto' }) }}>
              <div className="bd-row" style={{ display: 'grid', gridTemplateColumns: '2rem minmax(0, 1fr) minmax(0, 1fr)', gap: '0.75rem', padding: '0.5rem 0.75rem', borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: '0.875rem' }}>
                <span>#</span><span>{t('drafts.col.source')}</span><span>{t('drafts.col.target')}</span>
              </div>
              {paras.map(p => {
                const st = statusView(p);
                const off = termsFor(p);
                return (
                  <div key={p.idx} className="bd-row" style={{ display: 'grid', gridTemplateColumns: '2rem minmax(0, 1fr) minmax(0, 1fr)', gap: '0.75rem', padding: '0.75rem', borderBottom: `1px solid ${C.border}`, background: mismatched.has(p.idx) ? '#fffbeb' : '#fff' }}>
                    <span style={{ color: C.muted, fontSize: '0.8125rem' }}>{p.idx}</span>
                    <p lang="en" style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.5, background: '#f9fafb', padding: '0.25rem 0.5rem', borderRadius: '0.375rem' }}>{p.source_text}</p>
                    <div>
                      <textarea lang="vi" aria-label={`${t('drafts.col.target')} ${p.idx}`} rows={Math.max(3, Math.ceil(p.source_text.length / 60))} value={texts[p.idx] ?? ''}
                        readOnly={!draft.can_proofread} onChange={(e) => type(p.idx, e.target.value)} onBlur={() => { if (timers.current[p.idx]) { clearTimeout(timers.current[p.idx]); delete timers.current[p.idx]; save(p.idx, texts[p.idx] ?? ''); } }}
                        style={{ display: 'block', width: '100%', boxSizing: 'border-box', font: 'inherit', fontSize: '0.9375rem', lineHeight: 1.5 }} />
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.35rem', fontSize: '0.8125rem' }}>
                        <span style={{ color: p.status === 'reviewed' ? C.green : C.amber, fontWeight: 600 }}>{t(st.key, st.vars)}</span>
                        {saving[p.idx] === 'saving' ? <span style={{ color: C.muted }}>{t('drafts.saving')}</span> : saving[p.idx] === 'saved' ? <span style={{ color: C.muted }}>{t('drafts.saved')}</span>
                          : saving[p.idx] === 'error' ? <span role="alert" style={{ color: C.red }}>{t('drafts.save_error')}</span> : null}
                        {canMarkProofread(p, rights) ? <button type="button" style={btn} onClick={() => proofread(p.idx)}>{t('drafts.proofread')}</button> : null}
                        {!String(p.target_text).trim() && draft.can_edit && draft.translation.available ? (
                          <>{failed.includes(p.idx) ? <span style={{ color: C.red }}>{t('drafts.failed')}</span> : null}<button type="button" style={btn} onClick={() => retry(p.idx)}>{t('drafts.retry')}</button></>
                        ) : null}
                      </div>
                      {off.map(g => <span key={g.term_en} style={{ display: 'block', fontSize: '0.75rem', color: C.amber }}>{t('glossary.mismatch', mismatchVars(g))}</span>)}
                    </div>
                  </div>
                );
              })}
            </section>
            <aside style={box} aria-labelledby="bd-glossary">
              <h2 id="bd-glossary" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('glossary.title')}</h2>
              {draft.glossary.length === 0 ? <p style={{ margin: 0, color: C.muted, fontSize: '0.875rem' }}>{t('glossary.empty')}</p> : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                  {draft.glossary.map(g => <li key={g.term_en}><span lang="en">{g.term_en}</span> → <span lang="vi">{g.term_vi}</span>{draft.can_edit ? <> <button type="button" style={{ ...btn, padding: '0 0.4rem' }} onClick={() => removeTerm(g.term_en)}>{t('glossary.remove')}</button></> : null}</li>)}
                </ul>
              )}
              {draft.can_edit ? (
                <form onSubmit={addTerm} style={{ display: 'grid', gap: '0.35rem', marginTop: '0.75rem', fontSize: '0.875rem' }}>
                  <label>{t('glossary.term_en')}<input lang="en" value={term.term_en} maxLength={120} onChange={(e) => setTerm(x => ({ ...x, term_en: e.target.value }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box', font: 'inherit' }} /></label>
                  <label>{t('glossary.term_vi')}<input lang="vi" value={term.term_vi} maxLength={120} onChange={(e) => setTerm(x => ({ ...x, term_vi: e.target.value }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box', font: 'inherit' }} /></label>
                  <button type="submit" style={{ ...btn, justifySelf: 'start' }}>{t('glossary.add')}</button>
                </form>
              ) : null}
            </aside>
          </div>
          {draft.can_edit ? <details style={box}><summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('drafts.recreate')}</summary><div style={{ marginTop: '0.75rem' }}>{intake}</div></details> : null}
        </>
      )}
    </main>
  );
}
