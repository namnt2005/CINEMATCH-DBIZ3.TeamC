'use client';
// SC-33 in the order of docs/screens/screen-spec-SC-33.md: title and purpose (#2), topic chips (#3), time zone (#4),
// 1–3 preferred times (#5–#6) each with its Hanoi time (#7), the request summary (#8), *Send request* (#9) and
// *Your requests* (#10). VFDA replies by email — there is no calendar (BR-005). Every text from lib/i18n.
import { useEffect, useState } from 'react';
import { useT } from '../../lib/i18n/client.js';
import { TOPICS, canSend, canAddTime, hanoiTime, toRequest, defaultZone, formatInZone, requestStatus, isValidZone, timePair } from './consultation-view.js';

const C = { navy: '#0f2d52', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534', amber: '#92400e' };
const button = { background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.625rem 1rem', font: 'inherit', fontWeight: 600, cursor: 'pointer' };
const ghost = { ...button, background: '#fff', color: C.navy, border: `1px solid ${C.border}` };
const field = { display: 'block', width: '100%', padding: '0.5rem 0.625rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', font: 'inherit', boxSizing: 'border-box' };
const ZONES = ['Asia/Ho_Chi_Minh', 'Asia/Seoul', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Bangkok', 'Asia/Kolkata',
  'Australia/Sydney', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'UTC'];

export default function ConsultationForm({ initialRequests }) {
  const t = useT();
  const [topic, setTopic] = useState('');
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');
  const [times, setTimes] = useState(['']);
  const [requests, setRequests] = useState(initialRequests);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => { setTimezone(defaultZone()); }, []); // the browser's zone (#4), after hydration
  const zones = ZONES.includes(timezone) ? ZONES : [timezone, ...ZONES];
  const ready = canSend({ topic, timezone, times });
  const setTime = (i, v) => setTimes(list => list.map((x, j) => (j === i ? v : x)));

  async function send(e) {
    e.preventDefault();
    if (!ready || sending) return;
    setSending(true);
    setResult(null);
    const res = await fetch('/api/consultations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(toRequest({ topic, timezone, times })) }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    setSending(false);
    if (res?.status === 201) {
      setErrors({});
      setResult(body.email === 'sent' ? 'sent' : 'saved');
      setTopic('');
      setTimes(['']);
      const list = await fetch('/api/consultations').then(r => (r.ok ? r.json() : null)).catch(() => null);
      if (list) setRequests(list.requests);
    } else if (res?.status === 422 && body.fields) {
      setErrors(body.fields);
    } else {
      setResult('failed');
    }
  }

  return (
    <main style={{ maxWidth: '760px', margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.625rem', margin: 0 }}>{t('consult.title')}</h1>
      <p style={{ margin: '0.25rem 0 1.25rem', color: C.muted }}>{t('consult.purpose')}</p>

      {result === 'sent' ? <p role="status" style={{ background: '#f0fdf4', color: C.green, padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>{t('consult.sent')}</p> : null}
      {result === 'saved' ? <p role="status" style={{ background: '#fdf3dc', color: C.amber, padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>{t('consult.saved_no_email')}</p> : null}
      {result === 'failed' ? <p role="alert" style={{ background: '#fef2f2', color: C.red, padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>{t('consult.failed')}</p> : null}

      <form onSubmit={send} style={{ display: 'grid', gap: '1.25rem', background: '#fff', border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1.25rem' }}>
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{t('consult.topic.label')}</legend>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {TOPICS.map(v => (
              <button key={v} type="button" aria-pressed={topic === v} onClick={() => setTopic(v)}
                style={{ ...ghost, padding: '0.375rem 0.75rem', fontWeight: 500, ...(topic === v ? { background: C.navy, color: '#fff', borderColor: C.navy } : {}) }}>
                {t(`consult.topic.${v}`)}
              </button>
            ))}
          </div>
          {errors.topic ? <p role="alert" style={{ color: C.red, fontSize: '0.875rem', margin: '0.375rem 0 0' }}>{t(errors.topic)}</p> : null}
        </fieldset>

        <label style={{ fontWeight: 600 }}>{t('consult.timezone')}
          <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ ...field, marginTop: '0.375rem', fontWeight: 400 }}>
            {zones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          {errors.timezone || !isValidZone(timezone) ? <span role="alert" style={{ display: 'block', color: C.red, fontSize: '0.875rem', fontWeight: 400 }}>{t('consult.error.timezone')}</span> : null}
        </label>

        <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
          <legend style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{t('consult.times')}</legend>
          {times.map((value, i) => {
            const hanoi = hanoiTime(value, timezone);
            return (
              <div key={i}>
                <label style={{ fontSize: '0.875rem' }}>{t('consult.time_label', { n: i + 1, zone: timezone })}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <input type="datetime-local" value={value} onChange={e => setTime(i, e.target.value)} style={field} aria-describedby={`hanoi-${i}`} />
                    {times.length > 1 ? <button type="button" style={{ ...ghost, padding: '0.375rem 0.625rem' }} onClick={() => setTimes(list => list.filter((_, j) => j !== i))}>{t('consult.remove_time')}</button> : null}
                  </div>
                </label>
                <span id={`hanoi-${i}`} style={{ display: 'block', color: C.muted, fontSize: '0.8125rem', marginTop: '0.25rem' }}>
                  {hanoi ? t('consult.hanoi_time', { time: hanoi }) : null}
                </span>
              </div>
            );
          })}
          {canAddTime(times) ? <button type="button" style={{ ...ghost, justifySelf: 'start' }} onClick={() => setTimes(list => [...list, ''])}>{t('consult.add_time')}</button> : null}
          {errors.preferred_times ? <p role="alert" style={{ color: C.red, fontSize: '0.875rem', margin: 0 }}>{t(errors.preferred_times)}</p> : null}
        </fieldset>

        <section aria-labelledby="summary" style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '0.875rem 1rem' }}>
          <h2 id="summary" style={{ fontSize: '0.9375rem', margin: '0 0 0.375rem' }}>{t('consult.summary')}</h2>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>{topic ? t(`consult.topic.${topic}`) : t('consult.summary_no_topic')}</p>
          <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.875rem' }}>
            {times.map(v => timePair(v, timezone)).filter(Boolean).map((pair, i) => <li key={i}>{t('consult.summary_time', pair)}</li>)}
          </ul>
        </section>

        <button type="submit" disabled={!ready || sending} aria-busy={sending} style={{ ...button, justifySelf: 'start', opacity: !ready || sending ? 0.5 : 1 }}>
          {t(sending ? 'consult.sending' : 'consult.send')}
        </button>
      </form>

      <section aria-labelledby="mine" style={{ marginTop: '2rem' }}>
        <h2 id="mine" style={{ fontSize: '1.125rem' }}>{t('consult.mine')}</h2>
        {requests.length === 0 ? <p style={{ color: C.muted }}>{t('consult.none')}</p> : (
          <ul style={{ padding: 0, margin: 0, display: 'grid', gap: '0.625rem' }}>
            {requests.map(r => (
              <li key={r.booking_id} style={{ listStyle: 'none', border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '0.75rem 1rem', background: '#fff' }}>
                <strong>{t(`consult.topic.${r.topic}`)}</strong> · <span>{t(requestStatus(r))}</span>
                <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', fontSize: '0.875rem', color: C.muted }}>
                  {r.preferred_times.map(p => <li key={p}>{t('consult.summary_time', { local: formatInZone(p, r.timezone), zone: r.timezone, hanoi: formatInZone(p, 'Asia/Ho_Chi_Minh') })}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
