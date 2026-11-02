'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { statusLabel, availabilityLabel, rowAction, publishState, verifiedLine } from './admin-locations-view.js';
import { useT } from '../../../lib/i18n/client.js';
import { sceneLabel } from '../../locations/labels.js';

/*
 * SC-35 Admin — Locations, in the order of docs/screens/screen-spec-SC-35.md §3:
 * navigation and menu (#1–#2) → title and counts (#3) → filters (#4–#6) → location table (#7–#11)
 * → editor: the 20 fields (#13–#16) → photos, read-only (#17, #20–#22) → authority contact and
 * verification (#18–#19) → blocked reason, Save, Publish / Unpublish (#23–#25) → audit note (#26).
 */

const API = '/api/admin/locations';
const SCENE_TYPES = ['karst', 'river', 'village', 'rice_field', 'sea', 'floating_village', 'cave', 'jungle', 'old_town', 'market', 'rice_terrace', 'mountain', 'dunes', 'mangrove'];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const C = {
  border: '#e5e7eb', muted: '#6b7280', text: '#111827', blue: '#2563eb',
  redBg: '#fee2e2', red: '#b91c1c', greenBg: '#dcfce7', green: '#166534', amberBg: '#fef3c7', amber: '#92400e'
};
const input = { padding: '0.45rem 0.6rem', borderRadius: '0.375rem', border: `1px solid #d1d5db`, fontSize: '0.875rem', width: '100%', boxSizing: 'border-box' };
const button = (bg, color = '#fff', disabled = false) => ({
  backgroundColor: disabled ? '#e5e7eb' : bg, color: disabled ? '#9ca3af' : color, border: 'none', borderRadius: '0.375rem',
  padding: '0.5rem 1rem', fontWeight: 600, fontSize: '0.875rem', cursor: disabled ? 'not-allowed' : 'pointer'
});

const EMPTY_FORM = {
  name_vi: '', name_en: '', province_id: '', district: '', lat: '', lng: '', airport_km: '',
  scene_types: [], desc_vi: '', desc_en: '', crew_capacity: '', lodging_20km: '', grid_power: '', truck_access: '',
  months_to_avoid: null, permit_complexity: '', restriction_note: '', availability: 'open',
  night_shooting_allowed: '', rainy_months: null
};
const EMPTY_CONTACT = { authority_name: '', contact_name: '', contact_phone: '', contact_email: '' };

// ---- form <-> API values ------------------------------------------------------------------------

const yesNoToForm = (v) => (v === true ? 'yes' : v === false ? 'no' : '');
const yesNoFromForm = (v) => (v === 'yes' ? true : v === 'no' ? false : null);
const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
// Inputs and selects hold text, so numbers are kept as text in the form (no false "changed" state)
const asText = (v) => (v === null || v === undefined ? '' : String(v));

function formFromDetail(d) {
  return {
    name_vi: d.name_vi ?? '', name_en: d.name_en ?? '', province_id: asText(d.province_id), district: d.district ?? '',
    lat: asText(d.lat), lng: asText(d.lng), airport_km: asText(d.airport_km), scene_types: d.scene_types || [],
    desc_vi: d.desc_vi ?? '', desc_en: d.desc_en ?? '', crew_capacity: d.crew_capacity ?? '',
    lodging_20km: yesNoToForm(d.lodging_20km), grid_power: yesNoToForm(d.grid_power), truck_access: yesNoToForm(d.truck_access),
    months_to_avoid: d.months_to_avoid, permit_complexity: d.permit_complexity ?? '', restriction_note: d.restriction_note ?? '',
    availability: d.availability ?? 'open', night_shooting_allowed: d.night_shooting_allowed ?? '', rainy_months: d.rainy_months
  };
}

function payloadFromForm(f) {
  return {
    name_vi: f.name_vi, name_en: f.name_en, province_id: numOrNull(f.province_id), district: f.district || null,
    lat: numOrNull(f.lat), lng: numOrNull(f.lng), airport_km: numOrNull(f.airport_km), scene_types: f.scene_types,
    desc_vi: f.desc_vi, desc_en: f.desc_en, crew_capacity: f.crew_capacity || null,
    lodging_20km: yesNoFromForm(f.lodging_20km), grid_power: yesNoFromForm(f.grid_power), truck_access: yesNoFromForm(f.truck_access),
    months_to_avoid: f.months_to_avoid, permit_complexity: f.permit_complexity || null, restriction_note: f.restriction_note || null,
    availability: f.availability || null, night_shooting_allowed: f.night_shooting_allowed || null, rainy_months: f.rainy_months
  };
}

const contactFromDetail = (c) => (c
  ? { authority_name: c.authority_name, contact_name: c.contact_name, contact_phone: c.contact_phone, contact_email: c.contact_email ?? '' }
  : EMPTY_CONTACT);
const contactPayload = (c) => ({ ...c, contact_email: c.contact_email.trim() === '' ? null : c.contact_email });
const isBlank = (c) => Object.values(c).every(v => String(v).trim() === '');

async function call(path, method = 'GET', body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ---- small building blocks ------------------------------------------------------------------------

/** API error → text in the user's language: the field codes of a 422, else the error code (FR-006). */
function fieldErrors(t, data) {
  const out = {};
  for (const [field, code] of Object.entries(data.field_codes || {})) {
    out[field] = t(code.key, { ...(code.vars || {}), label: t(`admin.field.${field}`) });
  }
  for (const field of Object.keys(data.fields || {})) if (!out[field]) out[field] = t('admin.error.invalid');
  return out;
}
const apiError = (t, data, fallback) => (data?.error ? t(`admin.api.${data.error}`) : t(fallback));

function Field({ label, error, children, hint }) {
  return (
    <label style={{ display: 'block', fontSize: '0.8125rem', color: '#374151' }}>
      <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', color: C.muted, marginTop: '0.2rem' }}>{hint}</span>}
      {error && <span role="alert" style={{ display: 'block', color: C.red, marginTop: '0.2rem' }}>{error}</span>}
    </label>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '1rem 1.25rem', marginTop: '1rem', backgroundColor: '#fff' }}>
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: C.text }}>{title}</h3>
      {children}
    </section>
  );
}

const grid = (min = 220) => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: '0.75rem' });

// BR-003: "No data yet" (null) is not "none recorded" ([])
function MonthPicker({ label, value, onChange, error, noneLabel }) {
  const t = useT();
  const recorded = Array.isArray(value);
  return (
    <Field label={label} error={error}>
      <select style={{ ...input, marginBottom: '0.4rem' }} value={recorded ? 'recorded' : 'unknown'}
        onChange={e => onChange(e.target.value === 'recorded' ? [] : null)}>
        <option value="unknown">{t('admin.months.unknown')}</option>
        <option value="recorded">{t('admin.months.recorded')}</option>
      </select>
      {recorded && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
          {MONTHS.map(m => {
            const on = value.includes(m);
            return (
              <button key={m} type="button" aria-pressed={on}
                onClick={() => onChange(on ? value.filter(x => x !== m) : [...value, m].sort((a, b) => a - b))}
                style={{ ...button(on ? C.blue : '#f3f4f6', on ? '#fff' : '#374151'), padding: '0.25rem 0.5rem', fontWeight: 500 }}>
                {m}
              </button>
            );
          })}
          {value.length === 0 && <span style={{ color: C.muted, fontSize: '0.75rem', alignSelf: 'center' }}>{noneLabel}</span>}
        </div>
      )}
    </Field>
  );
}

function Banner({ banner }) {
  if (!banner) return null;
  const tone = banner.type === 'error' ? [C.redBg, C.red] : banner.type === 'warn' ? [C.amberBg, C.amber] : [C.greenBg, C.green];
  return (
    <div role={banner.type === 'error' ? 'alert' : 'status'}
      style={{ backgroundColor: tone[0], color: tone[1], padding: '0.75rem 1rem', borderRadius: '0.375rem', margin: '1rem 0', fontSize: '0.875rem' }}>
      {banner.text}
    </div>
  );
}

function ConfirmDialog({ dialog, onCancel, onConfirm, setReason }) {
  const t = useT();
  if (!dialog) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="confirm-title"
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(17,24,39,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '0.5rem', padding: '1.25rem', width: 'min(440px, 92vw)' }}>
        <h3 id="confirm-title" style={{ margin: '0 0 0.5rem' }}>{dialog.title}</h3>
        <p style={{ margin: '0 0 0.75rem', color: '#374151', fontSize: '0.875rem' }}>{dialog.text}</p>
        {dialog.kind === 'unpublish' && (
          <Field label={t('admin.dialog.reason')}>
            <textarea rows={2} style={input} value={dialog.reason} onChange={e => setReason(e.target.value)} />
          </Field>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <button type="button" style={button('#f3f4f6', '#374151')} onClick={onCancel}>{t('admin.dialog.cancel')}</button>
          <button type="button" style={button(dialog.kind === 'unpublish' ? C.red : C.blue)} onClick={onConfirm}>{dialog.confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ---- the screen -------------------------------------------------------------------------------------

export default function AdminLocationsClient({ provinces, staffName }) {
  const t = useT();
  const [list, setList] = useState({ counts: null, locations: [] });
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(null);
  const [filters, setFilters] = useState({ status: '', q: '', province_id: '' });

  const [selectedId, setSelectedId] = useState(null); // location id, 'new', or null
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState(EMPTY_FORM);
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [savedContact, setSavedContact] = useState(EMPTY_CONTACT);
  const [errors, setErrors] = useState({});
  const [contactErrors, setContactErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== '')).toString();
    const res = await call(`${API}${qs ? `?${qs}` : ''}`);
    setLoading(false);
    if (res.ok) { setList(res.data); setListError(null); } else setListError(apiError(t, res.data, 'admin.error.load_list'));
  }, [filters, t]);

  useEffect(() => { loadList(); }, [loadList]);

  const loadDetail = useCallback(async (id) => {
    const res = await call(`${API}/${id}`);
    if (!res.ok) { setBanner({ type: 'error', text: apiError(t, res.data, 'admin.error.load_one') }); return null; }
    setDetail(res.data);
    const f = formFromDetail(res.data);
    setForm(f); setSavedForm(f);
    const c = contactFromDetail(res.data.authority_contact);
    setContact(c); setSavedContact(c);
    setErrors({}); setContactErrors({});
    return res.data;
  }, [t]);

  const open = async (id) => { setBanner(null); setSelectedId(id); await loadDetail(id); };
  const openNew = () => {
    setBanner(null); setSelectedId('new'); setDetail(null);
    setForm(EMPTY_FORM); setSavedForm(EMPTY_FORM); setContact(EMPTY_CONTACT); setSavedContact(EMPTY_CONTACT);
    setErrors({}); setContactErrors({});
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e && e.target ? e.target.value : e }));
  const setC = (field) => (e) => setContact(c => ({ ...c, [field]: e.target.value }));
  const formDirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  const contactDirty = JSON.stringify(contact) !== JSON.stringify(savedContact);

  // SC-35 #24: Save the location fields, then the contact when it changed
  async function save() {
    setBusy(true); setBanner(null);
    let id = selectedId;
    if (id === 'new' || formDirty) {
      const res = id === 'new' ? await call(API, 'POST', payloadFromForm(form)) : await call(`${API}/${id}`, 'PUT', payloadFromForm(form));
      if (!res.ok) {
        setBusy(false);
        if (res.status === 422) { setErrors(fieldErrors(t, res.data)); setBanner({ type: 'error', text: t('admin.banner.check_fields') }); }
        else if (res.data.error === 'SLUG_TAKEN') { setErrors({ name_en: t('admin.api.SLUG_TAKEN') }); setBanner({ type: 'error', text: t('admin.api.SLUG_TAKEN') }); }
        else setBanner({ type: 'error', text: t('admin.banner.save_failed') });
        return;
      }
      setErrors({});
      if (id === 'new') { id = res.data.location_id; setSelectedId(id); }
    }
    if (contactDirty && !isBlank(contact)) {
      const res = await call(`${API}/${id}/authority-contact`, 'PUT', contactPayload(contact));
      if (!res.ok) {
        await loadDetail(id); setContact(contact); // keep what was typed
        setBusy(false);
        setContactErrors(fieldErrors(t, res.data));
        setBanner({ type: 'error', text: t('admin.banner.contact_failed') });
        return;
      }
    }
    await loadDetail(id); await loadList();
    setBusy(false);
    setBanner({ type: 'success', text: t('admin.banner.saved') });
  }

  async function verify() {
    setDialog(null); setBusy(true);
    const res = await call(`${API}/${selectedId}/authority-contact/verify`, 'POST');
    if (res.ok) {
      const d = await loadDetail(selectedId); await loadList();
      setBanner({ type: 'success', text: t('admin.banner.verified', { line: verifiedLine(d.authority_contact, t) }) });
    } else setBanner({ type: 'error', text: apiError(t, res.data, 'admin.error.verify') });
    setBusy(false);
  }

  async function publish(id = selectedId) {
    setBusy(true); setBanner(null);
    const res = await call(`${API}/${id}/publish`, 'POST');
    if (id === selectedId) await loadDetail(id);
    await loadList();
    setBusy(false);
    if (res.ok) {
      const name = (list.locations.find(l => l.location_id === id) || detail || {}).name_en || t('admin.the_location');
      setBanner({ type: 'success', text: t('admin.banner.published', { name }) });
    } else {
      // SC-35 Error state: refused by the database (BR-004) — red strip with blocked_reason
      setBanner({ type: 'error', text: res.data.blocked_reason
        ? t('admin.banner.publish_refused', { reason: publishState({ can_publish: false, blocked_reason: res.data.blocked_reason }, t).reason })
        : apiError(t, res.data, 'admin.error.publish') });
    }
  }

  async function unpublish() {
    const { id, reason } = dialog;
    setDialog(null); setBusy(true); setBanner(null);
    const res = await call(`${API}/${id}/unpublish`, 'POST', { reason });
    if (id === selectedId) await loadDetail(id);
    await loadList();
    setBusy(false);
    setBanner(res.ok
      ? { type: 'success', text: t('admin.banner.unpublished') }
      : { type: 'error', text: apiError(t, res.data, 'admin.error.unpublish') });
  }

  const askUnpublish = (row) => setDialog({
    kind: 'unpublish', id: row.location_id, reason: '', confirmLabel: t('admin.action.unpublish'),
    title: t('admin.dialog.unpublish_title', { name: row.name_en }),
    text: t('admin.dialog.unpublish_text')
  });
  const askVerify = () => setDialog({
    kind: 'verify', confirmLabel: t('admin.dialog.verify_confirm'), title: t('admin.dialog.verify_title'),
    text: t('admin.dialog.verify_text', { name: staffName })
  });

  function onRowAction(row) {
    const a = rowAction(row.intake_status);
    if (a.action === 'unpublish') askUnpublish(row);
    else if (a.action === 'publish') publish(row.location_id);
    else open(row.location_id);
  }

  const counts = list.counts;
  const editing = selectedId !== null;
  const pub = detail ? publishState(detail, t) : { disabled: true, reason: t('admin.publish.save_first') };
  const contactSaved = Boolean(detail?.authority_contact);
  const canVerify = contactSaved && !detail.authority_contact.contact_verified && !contactDirty;

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* #1 Navigation bar */}
      <header style={{ backgroundColor: '#111827', color: '#fff', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{t('admin.bar.title')}</strong>
        <span style={{ fontSize: '0.875rem', color: '#d1d5db' }}>{t('admin.bar.signed_in', { name: staffName })}</span>
      </header>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* #2 Admin menu */}
        <nav aria-label={t('admin.menu')} style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
          <span aria-current="page" style={{ fontWeight: 700, color: C.blue, borderBottom: `2px solid ${C.blue}`, paddingBottom: '0.25rem' }}>{t('admin.title')}</span>
        </nav>

        {/* #3 Title + counts by status, #4 New location */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', color: C.text }}>{t('admin.title')}</h1>
            {counts && (
              <p style={{ margin: '0.25rem 0 0', color: C.muted, fontSize: '0.875rem' }}>
                {t('admin.counts', counts)}
              </p>
            )}
          </div>
          <button type="button" style={button(C.blue)} onClick={openNew}>+ {t('admin.new')}</button>
        </div>

        {/* #5 Status filter, #6 search and province */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '1rem 0', alignItems: 'center' }}>
          <div role="group" aria-label={t('admin.filter.status')} style={{ display: 'flex', gap: '0.25rem' }}>
            {[['', t('admin.filter.all'), counts?.all], ['awaiting_contact', statusLabel('awaiting_contact', t), counts?.awaiting_contact], ['published', statusLabel('published', t), counts?.published], ['unpublished', statusLabel('unpublished', t), counts?.unpublished]].map(([value, label, n]) => (
              <button key={value || 'all'} type="button" aria-pressed={filters.status === value}
                onClick={() => setFilters(f => ({ ...f, status: value }))}
                style={{ ...button(filters.status === value ? C.text : '#fff', filters.status === value ? '#fff' : '#374151'), border: `1px solid ${C.border}`, fontWeight: 500 }}>
                {label}{n !== undefined ? ` ${n}` : ''}
              </button>
            ))}
          </div>
          <input aria-label={t('admin.filter.search')} placeholder={t('admin.filter.search_placeholder')} maxLength={200}
            style={{ ...input, width: '280px' }} value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} />
          <select aria-label={t('admin.field.province_id')} style={{ ...input, width: '200px' }} value={filters.province_id}
            onChange={e => setFilters(f => ({ ...f, province_id: e.target.value }))}>
            <option value="">{t('admin.filter.all_provinces')}</option>
            {provinces.map(p => <option key={p.province_id} value={p.province_id}>{p.name}</option>)}
          </select>
        </div>

        {/* #7 Location table */}
        {listError ? <Banner banner={{ type: 'error', text: listError }} /> : (
          <div style={{ overflowX: 'auto', backgroundColor: '#fff', border: `1px solid ${C.border}`, borderRadius: '0.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                  {['location', 'province', 'status', 'availability', 'contact', 'photos'].map(h => <th key={h} style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{t(`admin.table.${h}`)}</th>)}
                  <th style={{ padding: '0.6rem 0.75rem' }} />
                </tr>
              </thead>
              <tbody>
                {loading && list.locations.length === 0 && [1, 2, 3].map(i => (
                  <tr key={`skeleton-${i}`}><td colSpan={7} style={{ padding: '0.75rem' }}><div style={{ height: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.25rem' }} /></td></tr>
                ))}
                {!loading && list.locations.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '1.5rem', textAlign: 'center', color: C.muted }}>
                    {counts && counts.all === 0 ? t('admin.empty.none') : filters.status ? t('admin.empty.status') : t('admin.empty.search')}
                  </td></tr>
                )}
                {list.locations.map(row => {
                  const action = rowAction(row.intake_status, t);
                  return (
                    <tr key={row.location_id} style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: row.location_id === selectedId ? '#eff6ff' : undefined }}>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        {row.intake_status === 'published'
                          ? <a href={`/locations/${row.slug}`} target="_blank" rel="noreferrer" style={{ color: C.blue, fontWeight: 600 }}>{row.name_en}</a>
                          : <strong>{row.name_en}</strong>}
                        <div style={{ color: C.muted }}>{row.name_vi}</div>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{row.province}</td>
                      {/* #8 Location status */}
                      <td style={{ padding: '0.6rem 0.75rem' }}>{statusLabel(row.intake_status, t)}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{availabilityLabel(row.availability, t)}</td>
                      {/* #9 Authority contact verification */}
                      <td style={{ padding: '0.6rem 0.75rem', color: row.contact_verified ? C.green : C.red }}>{row.contact_verified ? t('admin.contact.verified_short') : t('admin.contact.not_verified')}</td>
                      {/* #10 Photo count */}
                      <td style={{ padding: '0.6rem 0.75rem' }}>{row.pending_photo_count ? t('admin.photos.count_pending', { count: row.photo_count, pending: row.pending_photo_count }) : row.photo_count}</td>
                      {/* #11 Row action */}
                      <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
                        <button type="button" onClick={() => onRowAction(row)} disabled={busy}
                          style={{ background: 'none', border: 'none', color: action.action === 'unpublish' ? C.red : C.blue, cursor: 'pointer', fontWeight: 600 }}>
                          {action.label}
                        </button>
                        {action.action !== 'edit' && (
                          <button type="button" onClick={() => open(row.location_id)}
                            style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer' }}>{t('admin.action.edit')}</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Banner banner={banner} />

        {/* #12 Location editor */}
        {editing && (
          <div style={{ marginTop: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, color: C.text }}>
              {selectedId === 'new' ? t('admin.new') : detail ? detail.name_en : t('admin.loading')}
            </h2>
            {detail && <p style={{ margin: '0.25rem 0 0', color: C.muted, fontSize: '0.875rem' }}>{t('admin.editor.status', { status: statusLabel(detail.intake_status, t), slug: detail.slug })}</p>}
            {selectedId === 'new' && <p style={{ margin: '0.25rem 0 0', color: C.muted, fontSize: '0.875rem' }}>{t('admin.editor.new_note')}</p>}

            {/* #13 Names, province, district, coordinates */}
            <Section title={t('admin.section.place')}>
              <div style={grid()}>
                <Field label={`${t('admin.field.name_vi')} *`} error={errors.name_vi}><input style={input} maxLength={200} value={form.name_vi} onChange={set('name_vi')} /></Field>
                <Field label={`${t('admin.field.name_en')} *`} error={errors.name_en}><input style={input} maxLength={200} value={form.name_en} onChange={set('name_en')} /></Field>
                <Field label={`${t('admin.field.province_id')} *`} error={errors.province_id}>
                  <select style={input} value={form.province_id} onChange={set('province_id')}>
                    <option value="">{t('admin.choose')}</option>
                    {provinces.map(p => <option key={p.province_id} value={p.province_id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label={t('admin.field.district')} error={errors.district}><input style={input} maxLength={120} value={form.district} onChange={set('district')} /></Field>
                <Field label={`${t('admin.field.lat')} *`} error={errors.lat} hint={t('admin.hint.lat')}><input style={input} inputMode="decimal" value={form.lat} onChange={set('lat')} /></Field>
                <Field label={`${t('admin.field.lng')} *`} error={errors.lng} hint={t('admin.hint.lng')}><input style={input} inputMode="decimal" value={form.lng} onChange={set('lng')} /></Field>
              </div>
            </Section>

            {/* #14 Scene types */}
            <Section title={`${t('admin.field.scene_types')} *`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {SCENE_TYPES.map(type => {
                  const on = form.scene_types.includes(type);
                  return (
                    <button key={type} type="button" aria-pressed={on}
                      onClick={() => setForm(f => ({ ...f, scene_types: on ? f.scene_types.filter(x => x !== type) : [...f.scene_types, type] }))}
                      style={{ ...button(on ? C.blue : '#f3f4f6', on ? '#fff' : '#374151'), fontWeight: 500, padding: '0.3rem 0.7rem' }}>
                      {sceneLabel(t, type)}
                    </button>
                  );
                })}
              </div>
              {errors.scene_types && <p role="alert" style={{ color: C.red, fontSize: '0.8125rem', margin: '0.4rem 0 0' }}>{errors.scene_types}</p>}
            </Section>

            {/* #15 Logistics, season, permit complexity and availability */}
            <Section title={t('admin.section.logistics')}>
              <div style={grid()}>
                <Field label={`${t('admin.field.crew_capacity')} *`} error={errors.crew_capacity}>
                  <select style={input} value={form.crew_capacity} onChange={set('crew_capacity')}>
                    <option value="">{t('admin.choose')}</option><option value="u15">{t('crew.u15')}</option><option value="15_50">{t('crew.15_50')}</option><option value="o50">{t('crew.o50')}</option>
                  </select>
                </Field>
                {['lodging_20km', 'grid_power', 'truck_access'].map(field => (
                  <Field key={field} label={`${t(`admin.field.${field}`)} *`} error={errors[field]}>
                    <select style={input} value={form[field]} onChange={set(field)}>
                      <option value="">{t('admin.choose')}</option><option value="yes">{t('detail.yes')}</option><option value="no">{t('detail.no')}</option>
                    </select>
                  </Field>
                ))}
                <Field label={t('admin.field.airport_km_unit')} error={errors.airport_km}><input style={input} inputMode="numeric" value={form.airport_km} onChange={set('airport_km')} /></Field>
                <Field label={`${t('admin.field.permit_complexity')} *`} error={errors.permit_complexity}>
                  <select style={input} value={form.permit_complexity} onChange={set('permit_complexity')}>
                    <option value="">{t('admin.choose')}</option><option value="low">{t('detail.permit.low')}</option><option value="medium">{t('detail.permit.medium')}</option><option value="high">{t('detail.permit.high')}</option>
                  </select>
                </Field>
                <Field label={`${t('admin.field.availability')} *`} error={errors.availability} hint={t('admin.hint.availability')}>
                  <select style={input} value={form.availability} onChange={set('availability')}>
                    <option value="open">{t('availability.open')}</option><option value="survey_in_progress">{t('availability.survey_in_progress')}</option><option value="paused">{t('availability.paused')}</option>
                  </select>
                </Field>
                <Field label={t('admin.field.night_shooting_allowed')} error={errors.night_shooting_allowed}>
                  <select style={input} value={form.night_shooting_allowed} onChange={set('night_shooting_allowed')}>
                    <option value="">{t('admin.months.unknown')}</option><option value="yes">{t('admin.night.yes')}</option><option value="no">{t('admin.night.no')}</option><option value="ask">{t('admin.night.ask')}</option>
                  </select>
                </Field>
              </div>
              <div style={{ ...grid(320), marginTop: '0.75rem' }}>
                <MonthPicker label={t('admin.field.months_to_avoid')} value={form.months_to_avoid} error={errors.months_to_avoid} noneLabel={t('admin.months.none_avoid')}
                  onChange={v => setForm(f => ({ ...f, months_to_avoid: v }))} />
                <MonthPicker label={t('admin.field.rainy_months')} value={form.rainy_months} error={errors.rainy_months} noneLabel={t('admin.months.none_rainy')}
                  onChange={v => setForm(f => ({ ...f, rainy_months: v }))} />
              </div>
            </Section>

            {/* #16 Descriptions and restriction note */}
            <Section title={t('admin.section.descriptions')}>
              <div style={grid(320)}>
                <Field label={`${t('admin.field.desc_vi')} *`} error={errors.desc_vi}><textarea rows={4} style={input} value={form.desc_vi} onChange={set('desc_vi')} /></Field>
                <Field label={`${t('admin.field.desc_en')} *`} error={errors.desc_en}><textarea rows={4} style={input} value={form.desc_en} onChange={set('desc_en')} /></Field>
                <Field label={t('admin.field.restriction_note')} error={errors.restriction_note}><textarea rows={2} style={input} value={form.restriction_note} onChange={set('restriction_note')} /></Field>
              </div>
            </Section>

            {/* #17 Photos (#20 status, #21 source and usage right, #22 upload — deferred, decision D3) */}
            <Section title={t('admin.section.photos')}>
              {detail?.photos?.length ? (
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8125rem' }}>
                  {detail.photos.map(p => (
                    <li key={p.image_url} style={{ marginBottom: '0.25rem' }}>
                      <strong>{t(`admin.photo_status.${p.status}`)}</strong> · {p.image_source} · {p.usage_right}
                    </li>
                  ))}
                </ul>
              ) : <p style={{ margin: 0, color: C.muted, fontSize: '0.8125rem' }}>{t('admin.photos.none')}</p>}
              <button type="button" disabled style={{ ...button(C.blue, '#fff', true), marginTop: '0.5rem' }}>+ {t('admin.photos.add')}</button>
              <span style={{ marginLeft: '0.5rem', color: C.muted, fontSize: '0.75rem' }}>{t('admin.photos.later')}</span>
            </Section>

            {/* #18 Local authority contact, #19 verification */}
            <Section title={t('location.contact.title')}>
              <div style={grid()}>
                <Field label={`${t('admin.field.authority_name')} *`} error={contactErrors.authority_name}><input style={input} maxLength={200} value={contact.authority_name} onChange={setC('authority_name')} /></Field>
                <Field label={`${t('admin.field.contact_name')} *`} error={contactErrors.contact_name}><input style={input} maxLength={120} value={contact.contact_name} onChange={setC('contact_name')} /></Field>
                <Field label={`${t('admin.field.contact_phone')} *`} error={contactErrors.contact_phone}><input style={input} maxLength={20} value={contact.contact_phone} onChange={setC('contact_phone')} /></Field>
                <Field label={t('admin.field.contact_email')} error={contactErrors.contact_email}><input style={input} type="email" maxLength={254} value={contact.contact_email} onChange={setC('contact_email')} /></Field>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.875rem', color: detail?.authority_contact?.contact_verified ? C.green : C.red }}>
                  {contactDirty ? t('admin.contact.changed') : verifiedLine(detail?.authority_contact || null, t)}
                </span>
                <button type="button" style={button(C.green, '#fff', !canVerify || busy)} disabled={!canVerify || busy} onClick={askVerify}>
                  {t('admin.contact.verify')}
                </button>
              </div>
            </Section>

            {/* #23 Publish blocked reason, #24 Save, #25 Publish / Unpublish */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button type="button" style={button(C.text, '#fff', busy || (!formDirty && !contactDirty && selectedId !== 'new'))}
                disabled={busy || (!formDirty && !contactDirty && selectedId !== 'new')} onClick={save}>{t('admin.save')}</button>
              {detail?.intake_status === 'published' ? (
                <button type="button" style={button(C.red, '#fff', busy)} disabled={busy} onClick={() => askUnpublish(detail)}>{t('admin.action.unpublish')}</button>
              ) : (
                <button type="button" style={button(C.blue, '#fff', pub.disabled || busy || formDirty || contactDirty)}
                  disabled={pub.disabled || busy || formDirty || contactDirty} aria-describedby="publish-reason" onClick={() => publish()}>
                  {detail?.intake_status === 'unpublished' ? t('admin.action.publish_again') : t('admin.action.publish')}
                </button>
              )}
              {detail?.intake_status !== 'published' && (
                <span id="publish-reason" style={{ color: C.red, fontSize: '0.8125rem' }}>
                  {formDirty || contactDirty ? t('admin.publish.save_changes') : pub.disabled ? pub.reason : ''}
                </span>
              )}
            </div>

            {/* #26 Audit note */}
            <p style={{ color: C.muted, fontSize: '0.75rem', marginTop: '1rem' }}>
              {t('admin.audit_note')}
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        dialog={dialog}
        onCancel={() => setDialog(null)}
        onConfirm={() => (dialog.kind === 'unpublish' ? unpublish() : verify())}
        setReason={reason => setDialog(d => ({ ...d, reason }))}
      />
    </div>
  );
}
