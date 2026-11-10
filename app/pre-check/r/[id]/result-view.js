'use client';
// SC-48 in the order of docs/screens/screen-spec-SC-48.md: title and run details (#2), attention level scale (#3),
// counts (#4), submitted text with numbered highlights (#5, #6), finding cards (#7–#10), actions (#11–#13) and the
// disclaimer (#14). The text and the passages come only from this browser's copy of the check (D3).
import { useEffect, useState } from 'react';
import { useLocale, useT } from '../../../../lib/i18n/client.js';
import { countWords } from '../../../../lib/content-check/words.js';
import { highlightSegments, resultMessage, methodLineKey, resultFromStored, sessionKey } from '../../../../lib/content-check/view.js';
import { LEVELS } from '../../../../lib/content-check/attention.js';
import FindingCard from '../../finding-card.js';

const C = { navy: '#0f2d52', blue: '#2563eb', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534', amber: '#92400e' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' };
const button = { background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 0.875rem', font: 'inherit', fontWeight: 600, cursor: 'pointer' };
const ghost = { ...button, background: '#fff', color: C.navy, border: `1px solid ${C.border}` };
const vnDate = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');

export default function ResultView({ stored, signedIn, projects }) {
  const t = useT();
  const locale = useLocale();
  const [copy, setCopy] = useState(null);
  const [project, setProject] = useState(projects[0]?.project_id ?? '');
  const [message, setMessage] = useState(null);
  useEffect(() => { try { setCopy(JSON.parse(sessionStorage.getItem(sessionKey(stored.brief_id)) || 'null')); } catch { setCopy(null); } }, [stored.brief_id]);
  const result = resultFromStored(stored, copy);
  const answer = copy && copy.brief_id === stored.brief_id ? copy : { ...stored, state: stored.findings.length ? 'findings' : stored.attention_level ? 'none' : 'could_not_check' };
  const line = resultMessage(answer);
  const method = methodLineKey(answer);

  async function save() {
    const findings = (copy?.findings || []).map(f => ({ rule_code: f.rule_code, quoted_text: f.quoted_text }));
    const res = await fetch(`/api/projects/${project}/content-checks`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: copy.text, lang: copy.lang, rule_version: stored.rule_version, findings }) }).catch(() => null);
    const out = res ? await res.json().catch(() => ({})) : {};
    const name = projects.find(p => p.project_id === project)?.project_name ?? '';
    if (res?.status === 201) setMessage({ ok: true, text: t('precheck.save.done', { project: name }), href: `/projects/${project}/content` });
    else setMessage({ ok: false, text: t(out.error === 'RULE_SET_CHANGED' ? 'precheck.save.rule_set_changed' : 'precheck.save.failed') });
  }

  return (
    <main style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1rem' }}>
      <header>
        <h1 style={{ fontSize: '1.6rem', margin: 0, color: C.navy }}>{t('precheck.result.title')}</h1>
        <p style={{ margin: '0.375rem 0 0', color: C.muted }}>{t('precheck.result.details', { date: vnDate(stored.created_at), version: stored.rule_version, words: result.text ? countWords(result.text) : '—', lang: t(`precheck.lang.${stored.lang}`) })}</p>
        {method ? <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: C.amber }}>{t(method)}</p> : null}
      </header>
      <section style={box} aria-labelledby="level">
        <h2 id="level" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('precheck.level.label')}</h2>
        <ol style={{ display: 'flex', gap: '0.375rem', listStyle: 'none', margin: 0, padding: 0 }}>
          {LEVELS.map(l => (
            <li key={l} aria-current={stored.attention_level === l ? 'true' : undefined}
              style={{ flex: 1, textAlign: 'center', padding: '0.5rem', borderRadius: '0.5rem', border: `2px solid ${stored.attention_level === l ? C.navy : C.border}`, fontWeight: stored.attention_level === l ? 700 : 400 }}>{t(`precheck.level.${l}`)}</li>
          ))}
        </ol>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>{t('precheck.counts', stored.counts)}</p>
        {line ? <p role="status" style={{ margin: '0.5rem 0 0' }}>{t(line.key, line.vars)}</p> : null}
      </section>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))', gap: '1rem', alignItems: 'start' }}>
        <section style={box} aria-labelledby="text">
          <h2 id="text" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('precheck.submitted_text')}</h2>
          {result.text ? (
            <p style={{ margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {highlightSegments(result.text, result.findings).map((s, i) => (s.finding ? (
                <a key={i} href={`#finding-${s.finding.n}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  <mark aria-label={`${t(s.finding.labelKey)} ${s.finding.n}`} style={{ background: s.finding.severity === 'action' ? '#fde2e1' : '#fef3c7' }}>{s.text}<sup>{s.finding.n}</sup></mark>
                </a>
              ) : <span key={i}>{s.text}</span>))}
            </p>
          ) : <p style={{ margin: 0, color: C.muted }}>{t('precheck.text_not_kept')}</p>}
        </section>
        <ul style={{ display: 'grid', gap: '0.5rem', margin: 0, padding: 0 }}>
          {result.findings.map(f => <FindingCard key={f.n} finding={{ ...f, is_sample: f.is_sample }} />)}
        </ul>
      </div>
      <section style={{ ...box, display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <a href="/pre-check" style={{ ...ghost, textDecoration: 'none' }}>{t('precheck.edit')}</a>
        {!signedIn ? <a href={`/login?next=${encodeURIComponent(`/pre-check/r/${stored.brief_id}`)}`} style={{ ...ghost, textDecoration: 'none' }}>{t('precheck.save.login')}</a> : null}
        {signedIn && !result.text ? <span style={{ fontSize: '0.875rem', color: C.muted }}>{t('precheck.save.no_text')}</span> : null}
        {signedIn && result.text && result.findings.length ? (projects.length ? (
          <>
            <label style={{ fontSize: '0.875rem' }}>{t('precheck.save.choose')}{' '}
              <select value={project} onChange={e => setProject(e.target.value)} style={{ font: 'inherit' }}>
                {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
              </select>
            </label>
            <button type="button" onClick={save} style={button}>{t('precheck.save')}</button>
          </>
        ) : <span style={{ fontSize: '0.875rem', color: C.muted }}>{t('precheck.save.none')}</span>) : null}
        <a href="/consult" style={{ ...ghost, textDecoration: 'none' }}>{t('precheck.ask_vfda')}</a>
        {message ? <p role={message.ok ? 'status' : 'alert'} style={{ margin: 0, width: '100%', color: message.ok ? C.green : C.red }}>{message.text}{message.href ? <> · <a href={message.href} style={{ color: C.blue }}>{t('content.title')}</a></> : null}</p> : null}
      </section>
      <p style={{ margin: 0, fontSize: '0.8125rem', color: C.muted }}>{t('precheck.disclaimer')}</p>
    </main>
  );
}
