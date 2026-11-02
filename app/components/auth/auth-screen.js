'use client';
// SC-04 Sign up and SC-05 Log in: one layout, the tab chosen by the route (/signup, /login).
// Built in the order of docs/screens/screen-spec-SC-04.md: frame → title → fields → buttons and links
// → error state → success state. Passwords go to the API and on to Supabase Auth only (SR-021, BR-004).
import { useMemo, useState } from 'react';
import { useLocale, useT } from '../../../lib/i18n/client.js';
import { validateSignUpInput, checkEmail, CREW_ROLES } from '../../../lib/auth/signup-input.js';
import { COUNTRY_CODES } from '../../../lib/auth/countries.js';
import AuthFrame from './frame.js';
import { Field, PasswordHint, ResendButton, postJson } from './fields.js';
import { C, card, panel, link, button, pair, fieldError } from './styles.js';

const withNext = (path, next) => (next ? `${path}?next=${encodeURIComponent(next)}` : path);

// ---- Title side: account value block (row 1) -------------------------------------------------------------
function ValueBlock() {
  const t = useT();
  return (
    <section aria-labelledby="value-title" style={{ flex: '1 1 18rem', minWidth: 0 }}>
      <h1 id="value-title" style={{ fontSize: '2rem', lineHeight: 1.25, margin: '0 0 0.75rem' }}>{t('auth.value.title')}</h1>
      <p style={{ color: C.muted, margin: '0 0 1.25rem' }}>{t('auth.value.lead')}</p>
      {['contacts', 'collab', 'timeline'].map(item => (
        <div key={item} style={{ ...panel, marginBottom: '0.75rem' }}>
          <div style={{ fontWeight: 600 }}>{t(`auth.value.${item}.title`)}</div>
          <div style={{ color: C.muted, fontSize: '0.875rem', marginTop: '0.25rem' }}>{t(`auth.value.${item}.text`)}</div>
        </div>
      ))}
    </section>
  );
}

// ---- Tabs (row 2): links, so the URL is /signup or /login ------------------------------------------------
function Tabs({ tab, next }) {
  const t = useT();
  const tabLink = (name, path) => (
    <a
      href={withNext(path, next)}
      aria-current={tab === name ? 'page' : undefined}
      style={{ ...link, color: tab === name ? C.text : C.muted, fontWeight: tab === name ? 700 : 500, padding: '0.5rem 0', borderBottom: tab === name ? `2px solid ${C.navy}` : '2px solid transparent' }}
    >
      {t(`auth.tab.${name}`)}
    </a>
  );
  return (
    <nav aria-label={t('auth.tabs')} style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid #e5e7eb', marginBottom: '1.25rem' }}>
      {tabLink('signup', '/signup')}
      {tabLink('login', '/login')}
    </nav>
  );
}

// ---- Create account form (rows 3–13) ---------------------------------------------------------------------
const EMPTY_FORM = { full_name: '', email: '', password: '', org_name: '', country: '', crew_role: '', website: '', terms_accepted: false };

function SignUpForm({ next }) {
  const t = useT();
  const locale = useLocale();
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [sentTo, setSentTo] = useState(null);

  const check = useMemo(() => validateSignUpInput({ ...form, locale }), [form, locale]);
  const countries = useMemo(() => {
    let names;
    try { names = new Intl.DisplayNames([locale], { type: 'region' }); } catch { names = null; }
    return COUNTRY_CODES.map(code => ({ code, name: names?.of(code) || code }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);

  const set = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm(f => ({ ...f, [name]: value }));
    setServerErrors(e => ({ ...e, [name]: undefined }));
  };
  const blur = (name) => () => setTouched(s => ({ ...s, [name]: true }));
  const errorOf = (name) => {
    if (serverErrors[name]) return serverErrors[name];
    return touched[name] && check.errors[name] ? t(check.errors[name]) : null;
  };

  async function submit(event) {
    event.preventDefault();
    if (!check.ok) {
      setTouched(Object.fromEntries(Object.keys(EMPTY_FORM).map(k => [k, true])));
      return;
    }
    setSubmitting(true);
    setFailure(null);
    const { status, json } = await postJson('/api/auth/sign-up', { ...form, locale, next });
    setSubmitting(false);
    if (status === 201) {
      setSentTo(check.value.email);
      return;
    }
    // Entered data is kept, except the password (SC-04 Error state)
    setForm(f => ({ ...f, password: '' }));
    if (json.error === 'EMAIL_TAKEN') {
      setServerErrors({ email: 'EMAIL_TAKEN' });
    } else if (json.error === 'VALIDATION_ERROR' && json.fields) {
      setServerErrors(Object.fromEntries(Object.entries(json.fields).map(([k, v]) => [k, t(v)])));
    } else {
      setFailure(json.error === 'AUTH_UNAVAILABLE' ? 'AUTH_UNAVAILABLE' : 'UNAVAILABLE');
    }
  }

  // ---- Success state: Check your inbox --------------------------------------------------------------------
  if (sentTo) {
    return (
      <div role="status">
        <h2 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem' }}>{t('signup.success.title')}</h2>
        <p style={{ color: C.muted, margin: '0 0 1.25rem' }}>{t('signup.success.text', { email: sentTo })}</p>
        <ResendButton onResend={() => postJson('/api/auth/resend-verification', { email: sentTo })} />
      </div>
    );
  }

  const emailError = errorOf('email');
  return (
    <form onSubmit={submit} noValidate>
      <fieldset disabled={submitting} style={{ border: 'none', padding: 0, margin: 0 }}>
        <div style={pair}>
          <Field id="full_name" label={t('signup.full_name')} error={errorOf('full_name')}>
            {(p) => <input {...p} name="full_name" autoComplete="name" maxLength={120} value={form.full_name} onChange={set('full_name')} onBlur={blur('full_name')} />}
          </Field>
          <Field id="email" label={t('signup.email')} error={emailError === 'EMAIL_TAKEN' ? null : emailError}>
            {(p) => <input {...p} name="email" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={set('email')} onBlur={blur('email')} />}
          </Field>
        </div>
        {emailError === 'EMAIL_TAKEN' ? (
          <div role="alert" style={{ ...fieldError, marginTop: '-0.5rem', marginBottom: '1rem' }}>
            {t('signup.email_taken')} — <a href={withNext('/login', next)} style={link}>{t('signup.email_taken_link')}</a>
          </div>
        ) : null}
        <Field id="password" label={t('signup.password')} error={errorOf('password')} hint={<PasswordHint password={form.password} />}>
          {(p) => <input {...p} name="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} onBlur={blur('password')} />}
        </Field>
        <div style={pair}>
          <Field id="org_name" label={t('signup.org_name')} error={errorOf('org_name')}>
            {(p) => <input {...p} name="org_name" autoComplete="organization" maxLength={200} value={form.org_name} onChange={set('org_name')} onBlur={blur('org_name')} />}
          </Field>
          <Field id="country" label={t('signup.country')} error={errorOf('country')}>
            {(p) => (
              <select {...p} name="country" autoComplete="country" value={form.country} onChange={set('country')} onBlur={blur('country')}>
                <option value="">{t('signup.country_placeholder')}</option>
                {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            )}
          </Field>
        </div>
        <div style={pair}>
          <Field id="crew_role" label={t('signup.crew_role')} error={errorOf('crew_role')}>
            {(p) => (
              <select {...p} name="crew_role" value={form.crew_role} onChange={set('crew_role')} onBlur={blur('crew_role')}>
                <option value="">{t('signup.crew_role_placeholder')}</option>
                {CREW_ROLES.map(r => <option key={r} value={r}>{t(`signup.crew_role.${r}`)}</option>)}
              </select>
            )}
          </Field>
          <Field id="website" label={t('signup.website')} optional={t('signup.optional')} error={errorOf('website')}>
            {(p) => <input {...p} name="website" type="url" autoComplete="url" maxLength={300} placeholder="https://" value={form.website} onChange={set('website')} onBlur={blur('website')} />}
          </Field>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.875rem' }}>
            <input
              type="checkbox" name="terms_accepted" checked={form.terms_accepted} onChange={set('terms_accepted')}
              aria-describedby={errorOf('terms_accepted') ? 'terms-error' : undefined} style={{ marginTop: '0.2rem' }}
            />
            <span>
              {t('signup.terms_before')}
              <a href="/terms" target="_blank" rel="noopener" style={link}>{t('signup.terms_link')}</a>
              {t('signup.terms_and')}
              <a href="/privacy" target="_blank" rel="noopener" style={link}>{t('signup.privacy_link')}</a>
              {t('signup.terms_after')}
            </span>
          </label>
          {errorOf('terms_accepted') ? <div id="terms-error" role="alert" style={fieldError}>{errorOf('terms_accepted')}</div> : null}
        </div>

        {/* Row 11: disabled while any required field is invalid; Loading state while sending */}
        <button type="submit" disabled={!check.ok || submitting} style={button(!check.ok || submitting)}>
          {submitting ? t('signup.submitting') : t('signup.submit')}
        </button>
      </fieldset>

      {failure ? <p role="alert" style={{ ...fieldError, marginTop: '0.75rem' }}>{t(`auth.error.${failure}`)}</p> : null}

      <p style={{ fontSize: '0.875rem', marginTop: '1rem' }}>
        {t('signup.have_account')} <a href={withNext('/login', next)} style={link}>{t('auth.tab.login')}</a>
      </p>
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', fontSize: '0.875rem' }}>
        <strong>{t('signup.supplier_title')}</strong> <span style={{ color: C.muted }}>{t('signup.supplier_text')}</span>
      </div>
    </form>
  );
}

// ---- Log in form (SC-05) -----------------------------------------------------------------------------------
function LinkExpiredBanner() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const valid = !checkEmail(email).error;
  return (
    <div role="alert" style={{ ...panel, background: C.redSoft, borderColor: '#f5c2c2', marginBottom: '1.25rem' }}>
      <div style={{ fontWeight: 700, color: C.red }}>{t('login.link_expired.title')}</div>
      <p style={{ margin: '0.5rem 0 0.75rem', fontSize: '0.875rem' }}>{t('login.link_expired.text')}</p>
      {sent ? (
        <ResendButton onResend={() => postJson('/api/auth/resend-verification', { email })} />
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label htmlFor="expired-email" style={{ position: 'absolute', left: '-9999px' }}>{t('login.email')}</label>
          <input id="expired-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
            style={{ flex: '1 1 12rem', padding: '0.5rem', border: `1px solid ${C.border}`, borderRadius: '0.5rem' }} />
          <button type="button" disabled={!valid} style={{ ...button(!valid), width: 'auto' }}
            onClick={async () => { await postJson('/api/auth/resend-verification', { email }); setSent(true); }}>
            {t('login.resend_email')}
          </button>
        </div>
      )}
    </div>
  );
}

function LogInForm({ next, linkExpired }) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState(null);
  const ready = !checkEmail(email).error && password.length > 0;

  async function submit(event) {
    event.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    setFailure(null);
    const { status, json } = await postJson('/api/auth/sign-in', { email, password, next });
    if (status === 200 && json.redirect) {
      // A full load, so the server components read the new session cookies
      window.location.assign(json.redirect);
      return;
    }
    setSubmitting(false);
    setPassword('');
    setFailure(['INVALID_CREDENTIALS', 'ACCOUNT_DEACTIVATED', 'EMAIL_NOT_VERIFIED', 'AUTH_UNAVAILABLE'].includes(json.error) ? json.error : 'UNAVAILABLE');
  }

  return (
    <form onSubmit={submit} noValidate>
      {linkExpired ? <LinkExpiredBanner /> : null}
      <fieldset disabled={submitting} style={{ border: 'none', padding: 0, margin: 0 }}>
        <Field id="login-email" label={t('login.email')}>
          {(p) => <input {...p} name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />}
        </Field>
        <Field id="login-password" label={t('login.password')}>
          {(p) => <input {...p} name="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />}
        </Field>
        <p style={{ margin: '-0.5rem 0 1rem', fontSize: '0.875rem' }}>
          <a href="/forgot-password" style={link}>{t('login.forgot')}</a>
        </p>
        <button type="submit" disabled={!ready || submitting} style={button(!ready || submitting)}>
          {submitting ? t('login.submitting') : t('login.submit')}
        </button>
      </fieldset>

      {/* Error state: one message for a wrong password and an unknown email (SC-04) */}
      {failure ? (
        <div role="alert" style={{ ...fieldError, marginTop: '0.75rem' }}>
          {t(`auth.error.${failure}`)}
          {failure === 'EMAIL_NOT_VERIFIED' ? (
            <div style={{ marginTop: '0.5rem' }}>
              <ResendButton startLocked={false} onResend={() => postJson('/api/auth/resend-verification', { email })} />
            </div>
          ) : null}
        </div>
      ) : null}

      <p style={{ fontSize: '0.875rem', marginTop: '1rem' }}>
        {t('login.no_account')} <a href={withNext('/signup', next)} style={link}>{t('auth.tab.signup')}</a>
      </p>
    </form>
  );
}

export default function AuthScreen({ tab, next, linkExpired }) {
  return (
    <AuthFrame>
      <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <ValueBlock />
        <section style={{ ...card, flex: '1 1 26rem', minWidth: 0 }}>
          <Tabs tab={tab} next={next} />
          {tab === 'signup' ? <SignUpForm next={next} /> : <LogInForm next={next} linkExpired={linkExpired} />}
        </section>
      </div>
    </AuthFrame>
  );
}
