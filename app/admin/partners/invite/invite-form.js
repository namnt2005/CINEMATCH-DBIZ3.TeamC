'use client';
// Invite a partner (BR-003): an existing organisation or a new one (layer 1 fields), the invited address, then the list
// of invitations with their state. The one-time link goes only to the email; this page never sees it.
import { useState } from 'react';
import { useT } from '../../../../lib/i18n/client.js';
import { SERVICE_GROUPS } from '../../../../lib/partners/service-groups.js';

const C = { navy: '#0f2d52', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff', display: 'grid', gap: '0.75rem' };
const field = { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.25rem', padding: '0.5rem', border: `1px solid ${C.border}`, borderRadius: '0.5rem', font: 'inherit' };
const button = { background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.55rem 1rem', font: 'inherit', fontWeight: 600, cursor: 'pointer' };
const vnDate = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
const EMPTY = { org_name: '', legal_form: '', hq_province: '', service_groups: [], provinces: [] };

export default function InviteForm({ organisations, initial, provinces }) {
  const t = useT();
  const [mode, setMode] = useState(organisations.length ? 'existing' : 'new');
  const [orgId, setOrgId] = useState(organisations[0]?.org_id ?? '');
  const [org, setOrg] = useState(EMPTY);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState(initial);
  const set = (k, v) => setOrg(o => ({ ...o, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    const body = mode === 'existing' ? { org_id: orgId, email } : { org: { ...org, hq_province: org.hq_province ? Number(org.hq_province) : null }, email };
    const res = await fetch('/api/admin/partner-invitations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    const out = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.status === 201) {
      setMessage({ ok: out.email === 'sent', text: t(`invitations.sent.${out.email}`) });
      setEmail('');
      setOrg(EMPTY);
      const again = await fetch('/api/admin/partner-invitations').catch(() => null);
      if (again?.ok) setList((await again.json()).invitations);
      return;
    }
    if (out.fields) setErrors(out.fields);
    setMessage({ ok: false, text: t(out.error === 'INVITATION_OPEN' ? 'invitations.error.open' : 'invitations.error.failed') });
  }

  const err = (k) => (errors[k] ? <span role="alert" style={{ display: 'block', color: C.red, fontSize: '0.8125rem' }}>{t(errors[k])}</span> : null);
  return (
    <main style={{ maxWidth: '880px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1rem' }}>
      <header>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{t('invitations.title')}</h1>
        <p style={{ margin: '0.25rem 0 0', color: C.muted }}>{t('invitations.intro')}</p>
      </header>
      <form onSubmit={submit} style={box} noValidate>
        <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <legend style={{ fontWeight: 600 }}>{t('invitations.field.organisation')}</legend>
          <label><input type="radio" name="mode" checked={mode === 'existing'} disabled={!organisations.length} onChange={() => setMode('existing')} /> {t('invitations.mode.existing')}</label>
          <label><input type="radio" name="mode" checked={mode === 'new'} onChange={() => setMode('new')} /> {t('invitations.mode.new')}</label>
        </fieldset>
        {mode === 'existing' ? (
          <label>{t('invitations.field.organisation')}
            <select value={orgId} onChange={e => setOrgId(e.target.value)} style={field}>
              {organisations.map(o => <option key={o.org_id} value={o.org_id}>{o.org_name}</option>)}
            </select>{err('org_id')}
          </label>
        ) : (
          <>
            <label>{t('org.field.name')}<input value={org.org_name} maxLength={200} onChange={e => set('org_name', e.target.value)} style={field} />{err('org_name')}</label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label style={{ flex: '1 1 12rem' }}>{t('org.field.legal_form')}<input value={org.legal_form} maxLength={60} onChange={e => set('legal_form', e.target.value)} style={field} />{err('legal_form')}</label>
              <label style={{ flex: '1 1 12rem' }}>{t('org.field.hq_province')}
                <select value={org.hq_province} onChange={e => set('hq_province', e.target.value)} style={field}>
                  <option value="">—</option>{provinces.map(p => <option key={p.province_id} value={p.province_id}>{p.name}</option>)}
                </select>
              </label>
            </div>
            <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
              <legend>{t('org.field.service_groups')}</legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.375rem' }}>
                {SERVICE_GROUPS.map(g => {
                  const on = org.service_groups.includes(g);
                  return <button key={g} type="button" aria-pressed={on} onClick={() => set('service_groups', on ? org.service_groups.filter(x => x !== g) : [...org.service_groups, g])}
                    style={{ border: `1px solid ${on ? C.navy : C.border}`, background: on ? C.navy : '#fff', color: on ? '#fff' : '#111827', borderRadius: '1rem', padding: '0.3rem 0.7rem', font: 'inherit', fontSize: '0.8125rem', cursor: 'pointer' }}>{t(`partners.group.${g}`)}</button>;
                })}
              </div>{err('service_groups')}
            </fieldset>
            <label>{t('org.field.provinces')}
              <select multiple size={6} value={org.provinces.map(String)} onChange={e => set('provinces', [...e.target.selectedOptions].map(o => Number(o.value)))} style={field}>
                {provinces.map(p => <option key={p.province_id} value={p.province_id}>{p.name}</option>)}
              </select>{err('provinces')}
            </label>
          </>
        )}
        <label>{t('invitations.field.email')}<input type="email" value={email} maxLength={254} onChange={e => setEmail(e.target.value)} style={field} />{err('email')}</label>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: C.muted }}>{t('invitations.note')}</p>
        <div><button type="submit" disabled={busy} style={button}>{t('invitations.submit')}</button></div>
        {message ? <p role={message.ok ? 'status' : 'alert'} style={{ margin: 0, color: message.ok ? C.green : C.red }}>{message.text}</p> : null}
      </form>
      <section style={box} aria-labelledby="sent-list">
        <h2 id="sent-list" style={{ fontSize: '1rem', margin: 0 }}>{t('invitations.list.title')}</h2>
        {list.length === 0 ? <p style={{ margin: 0, color: C.muted }}>{t('invitations.list.empty')}</p> : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.5rem' }}>
            {list.map(i => (
              <li key={i.invitation_id} style={{ borderTop: `1px solid ${C.border}`, paddingTop: '0.5rem' }}>
                <strong>{i.org_name}</strong> · {i.email}
                <span style={{ display: 'block', fontSize: '0.8125rem', color: C.muted }}>
                  {t(`invitations.state.${i.state}`)} · {t('invitations.list.dates', { sent: vnDate(i.invited_at), until: vnDate(i.expires_at) })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
