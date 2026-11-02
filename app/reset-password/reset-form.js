'use client';
// SC-07 Reset password, in the order of docs/screens/screen-spec-SC-07.md: frame → title and account email →
// password fields → button and note → error state (expired-link panel) → success state.
// The new password goes to Supabase Auth only (SR-221, BR-004).
import { useEffect, useRef, useState } from 'react';
import { useLocale, useT } from '../../lib/i18n/client.js';
import { checkPassword } from '../../lib/auth/signup-input.js';
import AuthFrame from '../components/auth/frame.js';
import { Field, PasswordHint, postJson } from '../components/auth/fields.js';
import { C, card, panel, button, fieldError, help } from '../components/auth/styles.js';

// SC-10 (project dashboard) is not built yet: /locations stands in, as after sign-in (Open question 2)
const AFTER_RESET = '/locations';

function ExpiredPanel({ email }) {
  const t = useT();
  return (
    <section style={{ ...card, borderColor: '#f5c2c2' }}>
      <div role="alert" style={{ ...panel, background: C.redSoft, borderColor: '#f5c2c2', color: C.red, fontWeight: 700 }}>{t('reset.expired.title')}</div>
      <p style={{ margin: '1rem 0' }}>{t('reset.expired.text')}</p>
      <a href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : '/forgot-password'}
        style={{ ...button(false, 'secondary'), display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
        {t('reset.expired.button')}
      </a>
    </section>
  );
}

export default function ResetForm({ email, expired: expiredAtLoad }) {
  const t = useT();
  const locale = useLocale();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expired, setExpired] = useState(expiredAtLoad);
  const [failure, setFailure] = useState(null);
  const [done, setDone] = useState(false);

  // Switching the language clears the typed passwords (SC-07 interaction 4)
  const firstLocale = useRef(locale);
  useEffect(() => {
    if (locale !== firstLocale.current) { setPassword(''); setRepeat(''); }
  }, [locale]);

  useEffect(() => {
    if (!done) return undefined;
    const timer = setTimeout(() => window.location.assign(AFTER_RESET), 3000);
    return () => clearTimeout(timer);
  }, [done]);

  const passwordError = password ? checkPassword(password) : null;
  const matches = repeat.length > 0 && repeat === password;
  const ready = !checkPassword(password) && matches;

  async function submit(event) {
    event.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    setFailure(null);
    const { status, json } = await postJson('/api/auth/reset-password', { new_password: password });
    setSubmitting(false);
    if (status === 200) { setDone(true); return; }
    setPassword('');
    setRepeat('');
    if (status === 410) setExpired(true);
    else if (json.fields?.new_password) setFailure(json.fields.new_password);
    else setFailure(`auth.error.${json.error === 'ACCOUNT_DEACTIVATED' ? 'ACCOUNT_DEACTIVATED' : 'UNAVAILABLE'}`);
  }

  let content;
  if (expired) {
    content = <ExpiredPanel email={email} />;
  } else if (done) {
    content = (
      <section role="status" style={card}>
        <h1 style={{ fontSize: '1.875rem', margin: '0 0 0.5rem' }}>{t('reset.success.title')}</h1>
        <p style={{ color: C.muted, margin: '0 0 1.25rem' }}>{t('reset.success.text')}</p>
        <a href={AFTER_RESET} style={{ ...button(false), display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>{t('reset.continue')}</a>
      </section>
    );
  } else {
    content = (
      <section style={card}>
        {/* Row 2: title and the account email */}
        <h1 style={{ fontSize: '1.875rem', margin: '0 0 0.5rem' }}>{t('reset.title')}</h1>
        {email ? <p style={{ color: C.muted, margin: '0 0 1.25rem' }}>{t('reset.for_account')} <strong style={{ color: C.text }}>{email}</strong></p> : null}
        <form onSubmit={submit} noValidate>
          <fieldset disabled={submitting} style={{ border: 'none', padding: 0, margin: 0 }}>
            {/* Rows 3–4 */}
            <Field id="new_password" label={t('reset.new_password')} error={passwordError ? t(passwordError) : null} hint={<PasswordHint password={password} />}>
              {(p) => <input {...p} name="new_password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />}
            </Field>
            <Field id="repeat_password" label={t('reset.repeat')} error={repeat && !matches ? t('reset.mismatch') : null}
              hint={matches ? <span style={{ color: C.green, fontWeight: 600 }}>✓ {t('reset.matches')}</span> : null}>
              {(p) => <input {...p} name="repeat_password" type="password" autoComplete="new-password" value={repeat} onChange={e => setRepeat(e.target.value)} />}
            </Field>
            {/* Row 5: disabled until rows 3–4 are valid; Loading state while saving */}
            <button type="submit" disabled={!ready || submitting} style={button(!ready || submitting)}>
              {submitting ? t('reset.submitting') : t('reset.submit')}
            </button>
          </fieldset>
          {/* Row 6 */}
          <p style={{ ...help, marginTop: '1rem' }}>{t('reset.signout_note')}</p>
          {failure ? <p role="alert" style={fieldError}>{t(failure)}</p> : null}
        </form>
      </section>
    );
  }

  return (
    <AuthFrame>
      <div style={{ maxWidth: '36rem', margin: '0 auto' }}>{content}</div>
    </AuthFrame>
  );
}
