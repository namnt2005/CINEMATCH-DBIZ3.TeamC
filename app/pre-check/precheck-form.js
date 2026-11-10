'use client';
// SC-03 in the order of docs/screens/screen-spec-SC-03.md: title (#2), summary box with its counter (#3, #4), language
// (#5), hints (#6), three optional questions (#7), the button (#8), privacy line and consent box (#9, D12), the rule set
// (#10) and the disclaimer (#11). The summary is sent once and never stored; the result is kept in this browser only (D3).
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '../../lib/i18n/client.js';
import { countWords, MAX_WORDS, FLAG_KEYS, FLAG_VALUES } from '../../lib/content-check/words.js';
import { canCheck, consentVisible, sessionKey } from '../../lib/content-check/view.js';

const C = { navy: '#0f2d52', blue: '#2563eb', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff' };
const button = { background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.625rem 1rem', font: 'inherit', fontWeight: 600, cursor: 'pointer' };
const HINTS = ['people', 'military', 'heritage', 'history'];
const looksVietnamese = (text) => /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(text);
const DRAFT = 'cinematch.precheck.draft';

export default function PrecheckForm({ basis }) {
  const t = useT();
  const router = useRouter();
  const [text, setText] = useState('');
  const [lang, setLang] = useState('en');
  const [langTouched, setLangTouched] = useState(false);
  const [flags, setFlags] = useState({});
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const abort = useRef(null);
  const words = countWords(text);

  // SC-48 *Edit summary and re-check* brings the previous text back (kept in this browser only)
  useEffect(() => {
    try { const draft = sessionStorage.getItem(DRAFT); if (draft) { const d = JSON.parse(draft); setText(d.text || ''); if (d.lang) setLang(d.lang); } } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => { if (!langTouched && text) setLang(looksVietnamese(text) ? 'vi' : 'en'); }, [text, langTouched]);

  async function submit(e) {
    e.preventDefault();
    if (!canCheck(text) || busy) return;
    setBusy(true);
    setError(null);
    abort.current = new AbortController();
    const body = { text, lang, flags: Object.keys(flags).length ? flags : undefined, consent_advanced: consentVisible(basis) && consent ? true : undefined };
    const res = await fetch('/api/precheck', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: abort.current.signal }).catch(() => null);
    const out = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.ok) {
      try {
        sessionStorage.setItem(sessionKey(out.brief_id), JSON.stringify({ ...out, text, lang }));
        sessionStorage.setItem(DRAFT, JSON.stringify({ text, lang }));
      } catch { /* the result page then shows what the server keeps */ }
      router.push(`/pre-check/r/${out.brief_id}`);
      return;
    }
    if (res?.status === 429) setError(t(out.signed_in ? 'precheck.error.rate_member' : 'precheck.error.rate_guest'));
    else if (res?.status === 422 && out.fields) setError(t(Object.values(out.fields)[0]));
    else if (res) setError(t('precheck.error.failed'));
  }

  return (
    <main style={{ maxWidth: '1100px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1rem' }}>
      <header>
        <h1 style={{ fontSize: '1.6rem', margin: 0, color: C.navy }}>{t('precheck.title')}</h1>
        <p style={{ margin: '0.375rem 0 0', color: C.muted }}>{t('precheck.lead')}</p>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))', gap: '1rem', alignItems: 'start' }}>
        <form onSubmit={submit} style={{ ...box, display: 'grid', gap: '0.875rem' }}>
          <div>
            <label htmlFor="summary" style={{ fontWeight: 600 }}>{t('precheck.summary.label')}</label>
            <textarea id="summary" rows={10} value={text} disabled={busy} placeholder={t('precheck.summary.placeholder')} onChange={e => setText(e.target.value)}
              style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.375rem', padding: '0.625rem', border: `1px solid ${C.border}`, borderRadius: '0.5rem', font: 'inherit' }} />
            <p aria-live="polite" style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: words > MAX_WORDS ? C.red : C.muted }}>{t('precheck.counter', { n: words })}</p>
          </div>
          <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
            <legend style={{ fontWeight: 600 }}>{t('precheck.lang.label')}</legend>
            {['en', 'vi'].map(l => (
              <label key={l} style={{ marginRight: '1rem' }}><input type="radio" name="lang" checked={lang === l} onChange={() => { setLang(l); setLangTouched(true); }} /> {t(`precheck.lang.${l}`)}</label>
            ))}
          </fieldset>
          <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
            <legend style={{ fontWeight: 600 }}>{t('precheck.questions.title')}</legend>
            {FLAG_KEYS.map(k => (
              <div key={k} style={{ margin: '0.375rem 0' }}>
                <span style={{ display: 'block', fontSize: '0.875rem' }}>{t(`precheck.question.${k}`)}</span>
                {FLAG_VALUES.map(v => (
                  <label key={v} style={{ marginRight: '0.875rem', fontSize: '0.875rem' }}>
                    <input type="radio" name={k} checked={flags[k] === v} onChange={() => setFlags(f => ({ ...f, [k]: v }))} /> {t(`precheck.answer.${v}`)}
                  </label>
                ))}
              </div>
            ))}
          </fieldset>
          {consentVisible(basis) ? (
            <label style={{ fontSize: '0.875rem' }}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> {t('precheck.consent')}</label>
          ) : null}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="submit" disabled={!canCheck(text) || busy} style={{ ...button, opacity: !canCheck(text) || busy ? 0.6 : 1 }}>{busy ? t('precheck.checking') : t('precheck.submit')}</button>
            {busy ? <button type="button" onClick={() => { abort.current?.abort(); setBusy(false); }} style={{ ...button, background: '#fff', color: C.navy, border: `1px solid ${C.border}` }}>{t('precheck.cancel')}</button> : null}
          </div>
          {error ? <p role="alert" style={{ margin: 0, color: C.red }}>{error}</p> : null}
          <p style={{ margin: 0, fontSize: '0.8125rem', color: C.muted }}>{t('precheck.privacy')}</p>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: C.muted }}>{t('precheck.disclaimer')}</p>
        </form>
        <aside style={{ display: 'grid', gap: '1rem' }}>
          <section style={box} aria-labelledby="hints">
            <h2 id="hints" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('precheck.hints.title')}</h2>
            <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', listStyle: 'none', margin: 0, padding: 0 }}>
              {HINTS.map(h => <li key={h} style={{ border: `1px solid ${C.border}`, borderRadius: '1rem', padding: '0.25rem 0.625rem', fontSize: '0.8125rem' }}>{t(`precheck.hint.${h}`)}</li>)}
            </ul>
          </section>
          <section style={box} aria-labelledby="basis">
            <h2 id="basis" style={{ fontSize: '1rem', margin: '0 0 0.5rem' }}>{t('precheck.basis.title')}</h2>
            <p style={{ margin: 0 }}>{t('precheck.basis', { version: basis.rule_version ?? '—', count: basis.approved_count })}</p>
            <p style={{ margin: '0.5rem 0 0' }}><a href="/requirements" style={{ color: C.blue }}>{t('precheck.library')}</a></p>
          </section>
        </aside>
      </div>
    </main>
  );
}
