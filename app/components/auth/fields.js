'use client';
// Form parts shared by SC-04, SC-06, SC-07: labelled field with its error announced (aria-describedby,
// role=alert), password length meter, and the Resend button locked for 60 seconds (SR-214).
import { useEffect, useState } from 'react';
import { useT } from '../../../lib/i18n/client.js';
import { PASSWORD_MIN, PASSWORD_MAX } from '../../../lib/auth/signup-input.js';
import { C, label as labelStyle, input as inputStyle, fieldError, help, button } from './styles.js';

export function Field({ id, label, error, hint, children, optional }) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label htmlFor={id} style={labelStyle}>
        {label}{optional ? <span style={{ fontWeight: 400, color: C.muted }}> {optional}</span> : null}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, style: { ...inputStyle, borderColor: error ? C.red : C.border } })}
      {hint ? <div id={`${id}-hint`} style={help}>{hint}</div> : null}
      {error ? <div id={`${id}-error`} role="alert" style={fieldError}>{error}</div> : null}
    </div>
  );
}

/** Length-based meter: Supabase Auth enforces the rules; this only guides the user (SC-04 row 5, SC-07 row 3). */
export function passwordStrength(password) {
  if (!password || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) return 'weak';
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(re => re.test(password)).length;
  return password.length >= 14 || kinds >= 3 ? 'strong' : 'fair';
}

export function PasswordHint({ password }) {
  const t = useT();
  if (!password) return t('auth.password.hint');
  const strength = passwordStrength(password);
  const color = strength === 'strong' ? C.green : strength === 'fair' ? '#b45309' : C.red;
  return (
    <>
      {t('auth.password.hint')} · <span style={{ color, fontWeight: 600 }}>{strength === 'strong' ? '✓ ' : ''}{t(`auth.password.${strength}`)}</span>
    </>
  );
}

export function ResendButton({ onResend, lockSeconds = 60, startLocked = true }) {
  const t = useT();
  const [left, setLeft] = useState(startLocked ? lockSeconds : 0);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (left <= 0) return undefined;
    const timer = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  async function resend() {
    setLeft(lockSeconds);
    await onResend();
    setSent(true);
  }
  return (
    <div>
      <button type="button" onClick={resend} disabled={left > 0} style={button(left > 0, 'secondary')}>
        {left > 0 ? t('auth.resend_wait', { seconds: left }) : t('auth.resend')}
      </button>
      {sent ? <p role="status" style={{ ...help, textAlign: 'center' }}>{t('auth.resent')}</p> : null}
    </div>
  );
}

export async function postJson(path, body) {
  try {
    const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  } catch {
    return { status: 0, json: { error: 'UNAVAILABLE' } };
  }
}
