'use client';
// SC-08 My account, in the order of docs/screens/screen-spec-SC-08.md: title (#2) → profile fields and
// Save (#3–#8) → email, role and Change password (#9–#10) → language (#11) → accepted documents (#12)
// → notifications (#13) → Delete my account (#14–#16); then the error and success states.
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useT, setLocale } from '../../lib/i18n/client.js';
import { formatDate, formatTime } from '../../lib/i18n/format.js';
import { validateAccountPatch } from '../../lib/auth/account-input.js';
import { CREW_ROLES } from '../../lib/auth/signup-input.js';
import { COUNTRY_CODES } from '../../lib/auth/countries.js';
import AuthFrame from '../components/auth/frame.js';
import { Field, postJson } from '../components/auth/fields.js';
import { C, card, panel, link, button, pair, fieldError } from '../components/auth/styles.js';

const fromAccount = (a) => ({
  full_name: a.full_name || '', crew_role: a.crew_role || '',
  org_name: a.organisation?.org_name || '', country: a.organisation?.country || '', website: a.organisation?.website || ''
});

export default function AccountForm({ account }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [saved, setSaved] = useState(fromAccount(account));
  const [form, setForm] = useState(fromAccount(account));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [serverErrors, setServerErrors] = useState({});
  const [resetSent, setResetSent] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);

  const changed = Object.fromEntries(Object.entries(form).filter(([k, v]) => v !== saved[k]));
  const check = validateAccountPatch(changed);
  const canSave = Object.keys(changed).length > 0 && check.ok && !saving;
  const countries = useMemo(() => {
    let names;
    try { names = new Intl.DisplayNames([locale], { type: 'region' }); } catch { names = null; }
    return COUNTRY_CODES.map(code => ({ code, name: names?.of(code) || code })).sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);
  const set = (name) => (e) => { setForm(f => ({ ...f, [name]: e.target.value })); setServerErrors(s => ({ ...s, [name]: undefined })); };
  const errorOf = (name) => serverErrors[name] || (name in changed && check.errors[name] ? t(check.errors[name]) : null);

  async function save(event) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true); setNotice(null);
    const res = await fetch('/api/account', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(changed) }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setSaving(false);
    if (res?.ok) {
      const next = fromAccount(data);
      setSaved(next); setForm(next);
      setNotice({ type: 'success', text: t('account.saved') });
      router.refresh(); // the header shows the new name
    } else {
      // Typed values are kept (SC-08 Error state)
      if (data.fields) setServerErrors(Object.fromEntries(Object.entries(data.fields).map(([k, v]) => [k, t(v)])));
      setNotice({ type: 'error', text: t('account.save_failed') });
    }
  }

  async function sendReset() {
    await postJson('/api/auth/forgot-password', { email: account.email });
    setResetSent(true);
  }

  async function deleteAccount() {
    setDeleting(true); setDeleteFailed(false);
    const { status } = await postJson('/api/account/deactivate', { confirm });
    if (status === 200) { window.location.assign('/?account_deleted=1'); return; }
    setDeleting(false); setDeleteFailed(true);
  }

  return (
    <AuthFrame>
      <fieldset disabled={deleting} style={{ border: 'none', padding: 0, margin: 0, maxWidth: '52rem', marginInline: 'auto' }}>
        <h1 style={{ fontSize: '1.875rem', margin: '0 0 0.25rem' }}>{t('account.title')}</h1>
        <p style={{ color: C.muted, margin: '0 0 1.5rem' }}>{t('account.lead')}</p>
        {deleting ? <p role="status" style={{ ...panel, marginBottom: '1rem' }}>{t('account.deleting')}</p> : null}
        {notice ? <p role={notice.type === 'error' ? 'alert' : 'status'} style={{ ...panel, background: notice.type === 'error' ? C.redSoft : '#dcfce7', color: notice.type === 'error' ? C.red : C.green, marginBottom: '1rem' }}>{notice.text}</p> : null}

        {/* #3–#8 profile and organisation */}
        <form onSubmit={save} noValidate style={{ ...card, marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', margin: '0 0 1rem' }}>{t('account.profile')}</h2>
          <div style={pair}>
            <Field id="full_name" label={t('signup.full_name')} error={errorOf('full_name')}>
              {(p) => <input {...p} autoComplete="name" maxLength={120} value={form.full_name} onChange={set('full_name')} />}
            </Field>
            <Field id="crew_role" label={t('signup.crew_role')} error={errorOf('crew_role')}>
              {(p) => (
                <select {...p} value={form.crew_role} onChange={set('crew_role')}>
                  <option value="">{t('signup.crew_role_placeholder')}</option>
                  {CREW_ROLES.map(r => <option key={r} value={r}>{t(`signup.crew_role.${r}`)}</option>)}
                </select>
              )}
            </Field>
          </div>
          {!account.organisation ? <p style={{ ...fieldError, marginTop: 0 }}>{t('account.add_organisation')}</p> : null}
          <div style={pair}>
            <Field id="org_name" label={t('signup.org_name')} error={errorOf('org_name')}>
              {(p) => <input {...p} autoComplete="organization" maxLength={200} value={form.org_name} onChange={set('org_name')} />}
            </Field>
            <Field id="country" label={t('signup.country')} error={errorOf('country')}>
              {(p) => (
                <select {...p} autoComplete="country" value={form.country} onChange={set('country')}>
                  <option value="">{t('signup.country_placeholder')}</option>
                  {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              )}
            </Field>
          </div>
          <Field id="website" label={t('signup.website')} optional={t('signup.optional')} error={errorOf('website')}>
            {(p) => <input {...p} type="url" autoComplete="url" maxLength={300} placeholder="https://" value={form.website} onChange={set('website')} />}
          </Field>
          <button type="submit" disabled={!canSave} style={{ ...button(!canSave), width: 'auto', padding: '0.625rem 1.25rem' }}>
            {saving ? t('account.saving') : t('account.save')}
          </button>
        </form>

        {/* #9–#10 sign-in: email and role read-only (SR-231, SR-232), Change password (FR-003) */}
        <section style={{ ...card, marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', margin: '0 0 1rem' }}>{t('account.sign_in')}</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(8rem, 12rem) 1fr', gap: '0.5rem 1rem', margin: '0 0 1rem' }}>
            <dt style={{ color: C.muted }}>{t('signup.email')}</dt>
            <dd style={{ margin: 0 }}>{account.email} · <span style={{ color: account.email_verified ? C.green : C.red }}>{account.email_verified ? t('account.verified') : t('account.not_verified')}</span></dd>
            <dt style={{ color: C.muted }}>{t('account.role')}</dt>
            <dd style={{ margin: 0 }}>{t(`role.${account.role}`)} <span style={{ color: C.muted }}>· {t('account.role_note')}</span></dd>
          </dl>
          {resetSent
            ? <p role="status" style={{ margin: 0 }}>{t('forgot.success', { email: account.email })}</p>
            : <button type="button" onClick={sendReset} style={{ ...button(false, 'secondary'), width: 'auto', padding: '0.5rem 1rem' }}>{t('account.change_password')}</button>}
        </section>

        {/* #11 language (FR-005): saved to the profile and the cookie, page re-rendered */}
        <section style={{ ...card, marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', margin: '0 0 0.75rem' }}>{t('account.language')}</h2>
          <div role="group" aria-label={t('frame.language')} style={{ display: 'flex', gap: '0.5rem' }}>
            {['vi', 'en'].map(value => (
              <button key={value} type="button" lang={value} aria-pressed={locale === value}
                onClick={() => locale !== value && setLocale(value, router, { signedIn: true })}
                style={{ border: `1px solid ${locale === value ? C.navy : C.border}`, background: locale === value ? '#e8eef7' : '#fff', fontWeight: locale === value ? 700 : 400, borderRadius: '9999px', padding: '0.375rem 0.875rem', cursor: 'pointer' }}>
                {t(`legal.language.${value}`)}
              </button>
            ))}
          </div>
        </section>

        {/* #12 accepted documents, read-only (SR-235, BR-003) */}
        <section style={{ ...card, marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', margin: '0 0 0.75rem' }}>{t('account.documents')}</h2>
          {account.consents.length === 0 ? <p style={{ margin: 0, color: C.muted }}>{t('legal.record.none')}</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9375rem' }}>
              <thead><tr style={{ textAlign: 'left', color: C.muted }}><th style={{ padding: '0.375rem 0' }}>{t('account.documents.version')}</th><th>{t('account.documents.accepted_at')}</th><th>{t('account.documents.open')}</th></tr></thead>
              <tbody>
                {account.consents.map(c => (
                  <tr key={c.consent_version} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '0.375rem 0' }}>{c.consent_version}</td>
                    <td>{t('notification.when', { date: formatDate(c.accepted_at), time: formatTime(c.accepted_at) })}</td>
                    <td>
                      <a href={`/terms?version=${encodeURIComponent(c.consent_version)}`} style={link}>{t('frame.terms')}</a>{' · '}
                      <a href={`/privacy?version=${encodeURIComponent(c.consent_version)}`} style={link}>{t('frame.privacy')}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* #13 notifications */}
        <section style={{ ...card, marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', margin: '0 0 0.5rem' }}>{t('header.notifications')}</h2>
          <p style={{ margin: 0 }}>{t('account.notifications_text')} <a href="/notifications" style={link}>{t('account.open_notifications')}</a></p>
        </section>

        {/* #14–#16 Delete my account (BR-005, SR-233, SR-234) */}
        <section style={{ ...card, borderColor: '#f5c2c2' }}>
          <h2 style={{ fontSize: '1.125rem', margin: '0 0 0.5rem', color: C.red }}>{t('account.delete.title')}</h2>
          <p style={{ margin: '0 0 1rem' }}>{t('account.delete.text')}</p>
          <Field id="confirm-delete" label={t('account.delete.confirm_label')} error={deleteFailed ? t('account.delete.failed') : null}>
            {(p) => <input {...p} autoComplete="off" value={confirm} onChange={e => setConfirm(e.target.value)} />}
          </Field>
          <button type="button" disabled={confirm !== 'DELETE' || deleting} onClick={deleteAccount}
            style={{ ...button(confirm !== 'DELETE' || deleting), background: confirm !== 'DELETE' || deleting ? '#94a3b8' : C.red, width: 'auto', padding: '0.625rem 1.25rem' }}>
            {t('account.delete.button')}
          </button>
        </section>
      </fieldset>
    </AuthFrame>
  );
}
