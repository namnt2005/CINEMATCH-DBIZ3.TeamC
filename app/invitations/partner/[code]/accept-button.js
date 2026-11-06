'use client';
import { useState } from 'react';
import { useT } from '../../../../lib/i18n/client.js';

const ERRORS = { EMAIL_MISMATCH: 'invitations.accept.mismatch', INVITATION_INVALID: 'invitations.accept.expired',
  ALREADY_MEMBER_OF_PROJECT: 'invitations.accept.on_project', FORBIDDEN: 'invitations.accept.forbidden' };

/** Accepts the invitation; on success the account is a partner and goes to its organisation (SC-21). */
export default function AcceptButton({ code }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function accept() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/partner-invitations/${encodeURIComponent(code)}/accept`, { method: 'POST' }).catch(() => null);
    if (res?.ok) { window.location.assign('/partners/me'); return; }
    const out = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    setError(ERRORS[out.error] ?? 'invitations.error.failed');
  }
  return (
    <div style={{ display: 'grid', gap: '0.5rem' }}>
      <div><button type="button" onClick={accept} disabled={busy}
        style={{ background: '#0f2d52', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.55rem 1rem', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}>{t('invitations.accept.button')}</button></div>
      {error ? <p role="alert" style={{ margin: 0, color: '#b91c1c' }}>{t(error)}</p> : null}
    </div>
  );
}
