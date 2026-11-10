'use client';
// SC-37 in the order of docs/screens/screen-spec-SC-37.md: title and rule-set summary (#3), *+ New rule* (#4), filters
// (#5, #6), rule table with status, version and row actions (#7–#10, Create revision D2), editor (#11–#19: code, topic and
// segments, severity, titles, descriptions, Points to consider and fallback keywords, citation), *Save draft* (#20),
// *Approve and sign* with a confirmation (#21), version history (#22) and the audit note (#23). admin reads only (D9).
import { useState } from 'react';
import { useT } from '../../../lib/i18n/client.js';
import { rowActions, canSign, historyRows } from '../../../lib/legal/view.js';
import { TOPICS, SEVERITIES, SEGMENTS } from '../../../lib/legal/input.js';

const C = { navy: '#0f2d52', blue: '#2563eb', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534', amber: '#92400e' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' };
const button = { background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 0.875rem', font: 'inherit', fontWeight: 600, cursor: 'pointer' };
const ghost = { ...button, background: '#fff', color: C.navy, border: `1px solid ${C.border}` };
const field = { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.25rem', padding: '0.4rem 0.5rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', font: 'inherit' };
const EMPTY = { rule_code: '', topic: 'security', severity: 'notice', title_vi: '', title_en: '', description_vi: '', description_en: '', guidance_vi: '', guidance_en: '',
  citation: '', keywords_vi: [], keywords_en: [], segments: ['A', 'B', 'C'] };
const words = (s) => s.split(',').map(w => w.trim()).filter(Boolean);

async function call(url, method, body) {
  const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  return { res, out: res ? await res.json().catch(() => ({})) : {} };
}

export default function RulesClient({ initial, history, canWrite }) {
  const t = useT();
  const [data, setData] = useState(initial);
  const [versions, setVersions] = useState(history);
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState('');
  const [rule, setRule] = useState(null);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});
  const editable = canWrite && rule && (rule.status === 'draft' || !rule.rule_id);
  const set = (k, v) => setRule(r => ({ ...r, [k]: v }));

  async function reload(keepId) {
    const [{ out: list }, { out: hist }] = await Promise.all([call('/api/admin/legal-rules', 'GET'), call('/api/admin/rule-set-versions', 'GET')]);
    if (list.rules) setData(list);
    if (hist.versions) setVersions(hist.versions);
    if (keepId) { const { out } = await call(`/api/admin/legal-rules/${keepId}`, 'GET'); if (out.rule_id) setRule(out); }
  }
  async function open(id) { setErrors({}); setMessage(null); const { out } = await call(`/api/admin/legal-rules/${id}`, 'GET'); if (out.rule_id) setRule(out); }
  async function save() {
    const body = { ...rule };
    const { res, out } = rule.rule_id ? await call(`/api/admin/legal-rules/${rule.rule_id}`, 'PATCH', body) : await call('/api/admin/legal-rules', 'POST', body);
    if (res?.ok) { setMessage({ ok: true, text: t('rules.saved') }); setErrors({}); await reload(out.rule_id); }
    else { setErrors(out.fields || {}); setMessage({ ok: false, text: t(out.error === 'CODE_EXISTS' ? 'rules.error.code_exists' : 'rules.failed') }); }
  }
  async function act(action, target = rule) {
    if (action !== 'revise' && !window.confirm(t(action === 'sign' ? 'rules.confirm.sign' : 'rules.confirm.retire'))) return;
    const { res, out } = await call(`/api/admin/legal-rules/${target.rule_id}/${action}`, 'POST');
    if (res?.ok) {
      const text = action === 'sign' ? t('rules.signed', { code: target.rule_code, version: out.rule_version })
        : action === 'retire' ? t('rules.retired') : t('rules.revised', { revision: out.revision, previous: out.revision - 1, code: target.rule_code });
      setMessage({ ok: true, text });
      await reload(out.rule_id ?? target.rule_id);
    } else if (out.error === 'CITATION_REQUIRED') {
      setErrors({ citation: 'rules.error.citation' });
      setMessage({ ok: false, text: t('rules.error.citation') });
    } else setMessage({ ok: false, text: t('rules.failed') });
  }

  const shown = data.rules.filter(r => (!topic || r.topic === topic) && (!status || r.status === status));
  const err = (k) => (errors[k] ? <span id={`err-${k}`} role="alert" style={{ display: 'block', color: C.red, fontSize: '0.8125rem' }}>{t(errors[k])}</span> : null);
  const input = (k, opts = {}) => (
    <label style={{ display: 'block', marginTop: '0.5rem' }}>{t(`rules.field.${k}`)}
      {opts.multi ? <textarea rows={3} disabled={!editable} value={rule[k] ?? ''} onChange={e => set(k, e.target.value)} style={field} aria-describedby={errors[k] ? `err-${k}` : undefined} />
        : <input disabled={!editable || (k === 'rule_code' && rule.rule_id)} value={rule[k] ?? ''} maxLength={opts.max} onChange={e => set(k, k === 'rule_code' ? e.target.value.toUpperCase() : e.target.value)}
          style={{ ...field, borderColor: errors[k] ? C.red : C.border }} aria-describedby={errors[k] ? `err-${k}` : undefined} />}
      {err(k)}
    </label>
  );

  return (
    <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', margin: 0, color: C.navy }}>{t('rules.title')}</h1>
          <p style={{ margin: '0.25rem 0 0', color: C.muted }}>{t('rules.summary', { version: data.rule_version ?? '—', approved: data.counts.approved ?? 0, draft: data.counts.draft ?? 0, retired: data.counts.retired ?? 0 })}</p>
        </div>
        {canWrite ? <button type="button" onClick={() => { setRule({ ...EMPTY }); setErrors({}); setMessage(null); }} style={button}>{t('rules.new')}</button> : null}
      </header>
      {message ? <p role={message.ok ? 'status' : 'alert'} style={{ margin: 0, color: message.ok ? C.green : C.red }}>{message.text}</p> : null}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label>{t('rules.filter.topic')} <select value={topic} onChange={e => setTopic(e.target.value)} style={{ font: 'inherit' }}><option value="">{t('rules.filter.all')}</option>{TOPICS.map(x => <option key={x} value={x}>{t(`rules.topic.${x}`)}</option>)}</select></label>
        <label>{t('rules.filter.status')} <select value={status} onChange={e => setStatus(e.target.value)} style={{ font: 'inherit' }}><option value="">{t('rules.filter.all')}</option>{['draft', 'approved', 'retired'].map(x => <option key={x} value={x}>{t(`rules.status.${x}`)} ({data.counts[x] ?? 0})</option>)}</select></label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 24rem), 1fr))', gap: '1rem', alignItems: 'start' }}>
        <section style={box} aria-labelledby="list">
          <h2 id="list" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('rules.list.title')}</h2>
          {shown.length === 0 ? <p style={{ color: C.muted }}>{t(data.rules.length ? 'rules.list.none_filter' : 'rules.list.empty')}</p> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.375rem' }}>
              {shown.map(r => (
                <li key={r.rule_id} style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: '0.375rem' }}>
                  <button type="button" onClick={() => open(r.rule_id)} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: C.blue, cursor: 'pointer', textAlign: 'left' }}>
                    <strong>{r.rule_code}</strong> · {r.title_en}
                  </button>
                  <span style={{ display: 'block', fontSize: '0.8125rem', color: C.muted }}>
                    {t(`rules.status.${r.status}`)} · {t('rules.revision', { n: r.revision })} · {r.rule_version ?? '—'}{r.is_sample ? ` · ${t('rules.sample')}` : ''}
                  </span>
                  {canWrite ? (
                    <span style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      {rowActions(r).filter(a => a !== 'edit' && a !== 'view').map(a => <button key={a} type="button" onClick={() => act(a, r)} style={{ ...ghost, padding: '0.2rem 0.5rem', fontSize: '0.8125rem' }}>{t(`rules.action.${a}`)}</button>)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section style={box} aria-labelledby="editor">
          <h2 id="editor" style={{ fontSize: '1rem', margin: 0 }}>{rule ? `${rule.rule_code || t('rules.new')} · ${rule.status ? t(`rules.status.${rule.status}`) : t('rules.status.draft')}` : t('rules.editor.empty')}</h2>
          {rule ? (
            <div>
              {rule.is_sample ? <p style={{ margin: '0.25rem 0', color: C.amber, fontSize: '0.8125rem' }}>{t('rules.sample')}</p> : null}
              {rule.status === 'approved' ? <p style={{ margin: '0.25rem 0', fontSize: '0.8125rem' }}><a href={`/requirements/${rule.rule_slug}`} style={{ color: C.blue }}>{t('rules.public_link')}</a></p> : null}
              {input('rule_code', { max: 40 })}
              <label style={{ display: 'block', marginTop: '0.5rem' }}>{t('rules.field.topic')}
                <select disabled={!editable} value={rule.topic} onChange={e => set('topic', e.target.value)} style={field}>{TOPICS.map(x => <option key={x} value={x}>{t(`rules.topic.${x}`)}</option>)}</select>
              </label>
              <fieldset style={{ border: 'none', margin: '0.5rem 0 0', padding: 0 }}>
                <legend>{t('rules.field.segments')}</legend>
                {SEGMENTS.map(x => <label key={x} style={{ marginRight: '0.75rem' }}><input type="checkbox" disabled={!editable} checked={(rule.segments || []).includes(x)} onChange={e => set('segments', e.target.checked ? [...(rule.segments || []), x] : (rule.segments || []).filter(y => y !== x))} /> {x}</label>)}
                {err('segments')}
              </fieldset>
              <fieldset style={{ border: 'none', margin: '0.5rem 0 0', padding: 0 }}>
                <legend>{t('rules.field.severity')}</legend>
                {SEVERITIES.map(x => <label key={x} style={{ marginRight: '0.75rem' }}><input type="radio" disabled={!editable} checked={rule.severity === x} onChange={() => set('severity', x)} /> {t(`precheck.severity.${x}`)}</label>)}
              </fieldset>
              {input('title_en', { max: 200 })}{input('title_vi', { max: 200 })}
              {input('description_en', { multi: true })}{input('description_vi', { multi: true })}
              {input('guidance_en', { multi: true })}{input('guidance_vi', { multi: true })}
              <label style={{ display: 'block', marginTop: '0.5rem' }}>{t('rules.field.keywords_en')}
                <input disabled={!editable} value={(rule.keywords_en || []).join(', ')} onChange={e => set('keywords_en', words(e.target.value))} style={field} />{err('keywords_en')}
              </label>
              <label style={{ display: 'block', marginTop: '0.5rem' }}>{t('rules.field.keywords_vi')}
                <input disabled={!editable} value={(rule.keywords_vi || []).join(', ')} onChange={e => set('keywords_vi', words(e.target.value))} style={field} />{err('keywords_vi')}
              </label>
              {input('citation', { max: 200 })}
              {rule.approved_by ? <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: C.muted }}>{t('rules.signed_line', { date: String(rule.approved_at || '').slice(0, 10), version: rule.rule_version })}</p> : null}
              {editable ? (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <button type="button" onClick={save} style={ghost}>{t('rules.save')}</button>
                  {rule.rule_id ? <button type="button" onClick={() => act('sign')} disabled={!canSign(rule)} style={{ ...button, opacity: canSign(rule) ? 1 : 0.6 }}>{t('rules.sign')}</button> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
      <section style={box} aria-labelledby="history">
        <h2 id="history" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('rules.history.title')}</h2>
        {versions.length === 0 ? <p style={{ color: C.muted }}>{t('rules.history.empty')}</p> : (
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {historyRows(versions).map(v => <li key={v.rule_version}><strong>{v.rule_version}</strong> · {String(v.created_at || '').slice(0, 10)}{v.signed.length ? ` · ${t('rules.history.signed', { codes: v.signed.join(', ') })}` : ''}{v.retired.length ? ` · ${t('rules.history.retired', { codes: v.retired.join(', ') })}` : ''}</li>)}
          </ul>
        )}
      </section>
      <p style={{ margin: 0, fontSize: '0.8125rem', color: C.muted }}>{t('rules.audit_note')}</p>
    </main>
  );
}
