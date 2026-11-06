'use client';
// SC-21 in the order of docs/screens/screen-spec-SC-21.md: title and status (#2), verification strip (#3), layer 1
// (#4–#7), layer 2 (#8, #10, #11), layer 3 (#12–#14), Preview as (#15), Save (#17), Deactivate (#18). The three sections
// say who sees them (SR-321); the badge and the Article 13 flag are read-only (SR-326). Every text from lib/i18n.
import { useState } from 'react';
import { useT } from '../../../lib/i18n/client.js';
import { SERVICE_GROUPS } from '../../../lib/partners/service-groups.js';
import { canSave, changedFields, previewAs, PORTFOLIO_HINT } from './partner-view.js';

const C = { navy: '#0f2d52', muted: '#6b7280', border: '#e5e7eb', red: '#b91c1c', green: '#166534', amber: '#92400e' };
const box = { border: `1px solid ${C.border}`, borderRadius: '0.75rem', padding: '1rem', background: '#fff', display: 'grid', gap: '0.75rem' };
const field = { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.25rem', padding: '0.5rem', border: `1px solid ${C.border}`, borderRadius: '0.375rem', font: 'inherit', fontWeight: 400 };
const vnDate = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
const lines = (s) => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
const commas = (s) => String(s || '').split(',').map(x => x.trim()).filter(Boolean);

function draftOf(mine) {
  const o = mine.organisation; const m = mine.member || {}; const p = mine.private || {};
  return { org_name: o.org_name, legal_form: o.legal_form, founded_year: o.founded_year ?? '', hq_province: o.hq_province ?? '', service_groups: o.service_groups || [],
    provinces: (o.provinces || []).map(Number), capability_desc_en: m.capability_desc_en || '', capability_desc_vi: m.capability_desc_vi || '',
    working_languages: m.working_languages || [], portfolio: m.portfolio || [],
    rate_card: Array.isArray(p.rate_card) ? p.rate_card.map(({ item, amount, unit }) => ({ item, amount, unit })) : [], past_clients: p.past_clients || [], direct_contact: p.direct_contact || '' };
}

export default function OrgForm({ initial, provinces }) {
  const t = useT();
  const [mine, setMine] = useState(initial);
  const base = draftOf(mine);
  const [draft, setDraft] = useState(base);
  const [preview, setPreview] = useState('guest');
  const [status, setStatus] = useState(null);
  const [typed, setTyped] = useState('');
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const org = mine.organisation;
  const v = mine.verification;
  const normalised = { ...draft, founded_year: draft.founded_year === '' ? null : Number(draft.founded_year), hq_province: draft.hq_province === '' ? null : Number(draft.hq_province) };
  const normalisedBase = { ...base, founded_year: base.founded_year === '' ? null : Number(base.founded_year), hq_province: base.hq_province === '' ? null : Number(base.hq_province) };
  const shown = previewAs(mine, preview);

  async function save(e) {
    e.preventDefault();
    const body = Object.fromEntries(changedFields(normalisedBase, normalised).map(k => [k, normalised[k]]));
    const res = await fetch('/api/partners/me', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    if (res?.ok) { const next = await res.json(); setMine(next); setDraft(draftOf(next)); setStatus({ ok: true, text: t('org.saved') }); }
    else setStatus({ ok: false, text: t('org.save_failed') });
  }
  async function deactivate() {
    const res = await fetch('/api/partners/me/deactivate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ typed_name: typed }) }).catch(() => null);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok) { setStatus({ ok: true, text: t('org.deactivate.done', { n: body.withdrawn }) }); setMine(m => ({ ...m, organisation: { ...m.organisation, org_status: 'deactivated' } })); }
    else setStatus({ ok: false, text: t(body.fields?.typed_name || 'org.error.typed_name') });
  }

  return (
    <main style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gap: '1rem' }}>
      <header>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{t('org.title')} · {org.org_name}</h1>
        <p style={{ margin: '0.25rem 0 0', color: C.muted }}>{t(`org.status.${org.org_status || 'active'}`)}</p>
      </header>
      <p role="status" style={{ ...box, display: 'block', background: '#f5f8fc' }}>
        {v.status === 'pending' ? t('org.verification.pending') : v.status === 'approved' && v.verified_until ? t('org.verification.approved', { date: vnDate(v.verified_until) })
          : v.status === 'rejected' ? t('org.verification.rejected', { reason: v.reason || '—' }) : t('org.verification.none')}
        {' '}{v.status !== 'pending' ? <a href="/partners/me/verify" style={{ color: '#2563eb' }}>{t('org.verification.link')}</a> : null}
      </p>
      <p style={{ margin: 0, fontSize: '0.875rem', color: C.muted }}>{t('org.readonly')} {t('org.no_moderation')}</p>

      <form onSubmit={save} style={{ display: 'grid', gap: '1rem' }}>
        <section style={box} aria-labelledby="l1">
          <h2 id="l1" style={{ fontSize: '1rem', margin: 0 }}>{t('org.section.public')}</h2>
          <label>{t('org.field.name')}<input value={draft.org_name} maxLength={200} onChange={e => set('org_name', e.target.value)} style={field} /></label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{ flex: '1 1 12rem' }}>{t('org.field.legal_form')}<input value={draft.legal_form} maxLength={60} onChange={e => set('legal_form', e.target.value)} style={field} /></label>
            <label style={{ flex: '0 1 8rem' }}>{t('org.field.founded_year')}<input inputMode="numeric" value={draft.founded_year} onChange={e => set('founded_year', e.target.value.replace(/\D/g, '').slice(0, 4))} style={field} /></label>
            <label style={{ flex: '1 1 12rem' }}>{t('org.field.hq_province')}
              <select value={draft.hq_province} onChange={e => set('hq_province', e.target.value)} style={field}>
                <option value="">—</option>{provinces.map(p => <option key={p.province_id} value={p.province_id}>{p.name}</option>)}
              </select>
            </label>
          </div>
          <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
            <legend>{t('org.field.service_groups')}</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.375rem' }}>
              {SERVICE_GROUPS.map(g => {
                const on = draft.service_groups.includes(g);
                return <button key={g} type="button" aria-pressed={on} onClick={() => set('service_groups', on ? draft.service_groups.filter(x => x !== g) : [...draft.service_groups, g])}
                  style={{ border: `1px solid ${on ? C.navy : C.border}`, background: on ? C.navy : '#fff', color: on ? '#fff' : '#111827', borderRadius: '1rem', padding: '0.3rem 0.7rem', font: 'inherit', fontSize: '0.8125rem', cursor: 'pointer' }}>{t(`partners.group.${g}`)}</button>;
              })}
            </div>
          </fieldset>
          <label>{t('org.field.provinces')}
            <select multiple size={6} value={draft.provinces.map(String)} onChange={e => set('provinces', [...e.target.selectedOptions].map(o => Number(o.value)))} style={field}>
              {provinces.map(p => <option key={p.province_id} value={p.province_id}>{p.name}</option>)}
            </select>
          </label>
        </section>

        <section style={box} aria-labelledby="l2">
          <h2 id="l2" style={{ fontSize: '1rem', margin: 0 }}>{t('org.section.member')}</h2>
          <label>{t('org.field.capability_en')}<textarea rows={3} value={draft.capability_desc_en} onChange={e => set('capability_desc_en', e.target.value)} style={field} /></label>
          <label>{t('org.field.capability_vi')}<textarea rows={3} value={draft.capability_desc_vi} onChange={e => set('capability_desc_vi', e.target.value)} style={field} /></label>
          <label>{t('org.field.languages')}<input value={draft.working_languages.join(', ')} onChange={e => set('working_languages', commas(e.target.value.toLowerCase()))} style={field} /></label>
          <label>{t('org.field.portfolio')}<textarea rows={3} value={draft.portfolio.join('\n')} onChange={e => set('portfolio', lines(e.target.value))} style={field} />
            <span style={{ fontSize: '0.75rem', color: C.muted }}>{t(PORTFOLIO_HINT)}</span></label>
        </section>

        <section style={box} aria-labelledby="l3">
          <h2 id="l3" style={{ fontSize: '1rem', margin: 0 }}>{t('org.section.private')}</h2>
          <label>{t('org.field.rate_card')}
            <textarea rows={3} value={draft.rate_card.map(r => `${r.item}; ${r.amount}; ${r.unit}`).join('\n')}
              onChange={e => set('rate_card', lines(e.target.value).map(l => { const [item, amount, unit] = l.split(';').map(x => (x || '').trim()); return { item, amount: Number(amount), unit }; }))} style={field} />
          </label>
          <label>{t('org.field.past_clients')}<input value={draft.past_clients.join(', ')} onChange={e => set('past_clients', commas(e.target.value))} style={field} /></label>
          <label>{t('org.field.direct_contact')}<input value={draft.direct_contact} maxLength={200} onChange={e => set('direct_contact', e.target.value)} style={field} /></label>
        </section>

        {status ? <p role={status.ok ? 'status' : 'alert'} style={{ margin: 0, color: status.ok ? C.green : C.red }}>{status.text}</p> : null}
        <button type="submit" disabled={!canSave(normalisedBase, normalised) || org.org_status === 'deactivated'}
          style={{ justifySelf: 'start', background: C.navy, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.55rem 1rem', font: 'inherit', fontWeight: 600, opacity: canSave(normalisedBase, normalised) ? 1 : 0.5 }}>{t('org.save')}</button>
      </form>

      <section style={box} aria-labelledby="preview">
        <h2 id="preview" style={{ fontSize: '1rem', margin: 0 }}>{t('org.preview')}</h2>
        <div role="tablist" style={{ display: 'flex', gap: '0.375rem' }}>
          {['guest', 'member', 'accepted'].map(k => (
            <button key={k} type="button" role="tab" aria-selected={preview === k} onClick={() => setPreview(k)}
              style={{ border: `1px solid ${preview === k ? C.navy : C.border}`, background: preview === k ? C.navy : '#fff', color: preview === k ? '#fff' : C.navy, borderRadius: '0.5rem', padding: '0.35rem 0.75rem', font: 'inherit' }}>{t(`org.preview.${k}`)}</button>
          ))}
        </div>
        <p style={{ margin: 0 }}>{t('org.preview.layers', { list: Object.entries(shown.layers).filter(([, open]) => open).map(([l]) => t(`partners.layer.${l}`)).join(', ') })}</p>
      </section>

      {org.org_status !== 'deactivated' ? (
        <section style={{ ...box, borderColor: '#fecaca' }} aria-labelledby="deactivate">
          <h2 id="deactivate" style={{ fontSize: '1rem', margin: 0, color: C.red }}>{t('org.deactivate.title')}</h2>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>{t('org.deactivate.text')}</p>
          <label>{t('org.field.name')}<input value={typed} onChange={e => setTyped(e.target.value)} style={field} /></label>
          <button type="button" onClick={deactivate} disabled={typed.trim() !== org.org_name.trim()}
            style={{ justifySelf: 'start', background: C.red, color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 0.9rem', font: 'inherit', fontWeight: 600, opacity: typed.trim() === org.org_name.trim() ? 1 : 0.5 }}>{t('org.deactivate.button')}</button>
        </section>
      ) : null}
    </main>
  );
}
