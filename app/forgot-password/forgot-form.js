'use client';
// SC-06 Forgot password, in the order of docs/screens/screen-spec-SC-06.md: frame → title → email field →
// button and link → error state → success state. Same answer whether or not the account exists (SR-211).
import { useState } from 'react';
import { useT } from '../../lib/i18n/client.js';
import { checkEmail } from '../../lib/auth/signup-input.js';
import AuthFrame from '../components/auth/frame.js';
import { Field, ResendButton, postJson } from '../components/auth/fields.js';
import { C, card, panel, link, button, fieldError } from '../components/auth/styles.js';

export default function ForgotForm({ initialEmail }) {
  const t = useT();
  const [email, setEmail] = useState(initialEmail || '');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sentTo, setSentTo] = useState(null);
  const { email: clean, error } = checkEmail(email);

  const send = () => postJson('/api/auth/forgot-password', { email: clean });

  async function submit(event) {
    event.preventDefault();
    setTouched(true);
    if (error) return;
    setSubmitting(true);
    setFailed(false);
    const { status } = await send();
    setSubmitting(false);
    if (status === 200) setSentTo(clean);
    else setFailed(true);
  }

  return (
    <AuthFrame>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start' }}>
        <section style={{ ...card, flex: '1 1 24rem', maxWidth: '36rem', minWidth: 0 }}>
          {/* Row 2: title and explanation */}
          <h1 style={{ fontSize: '1.875rem', margin: '0 0 0.5rem' }}>{t('forgot.title')}</h1>
          <p style={{ color: C.muted, margin: '0 0 1.25rem' }}>{t('forgot.lead')}</p>

          {sentTo ? (
            // Success state: the form is replaced by the neutral confirmation (SR-211), Resend locked 60 s (SR-214)
            <div>
              <p role="status" style={{ ...panel, margin: '0 0 1rem' }}>{t('forgot.success', { email: sentTo })}</p>
              <ResendButton onResend={send} />
              <p style={{ fontSize: '0.875rem', marginTop: '1rem' }}>
                <a href="/login" style={link}>{t('forgot.back')}</a>
              </p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <fieldset disabled={submitting} style={{ border: 'none', padding: 0, margin: 0 }}>
                {/* Row 3: work email */}
                <Field id="email" label={t('signup.email')} error={touched && error ? t(error) : null}>
                  {(p) => <input {...p} name="email" type="email" autoComplete="email" maxLength={254} value={email}
                    onChange={e => setEmail(e.target.value)} onBlur={() => setTouched(true)} />}
                </Field>
                {/* Row 4: disabled while the email is empty or invalid; Loading state while sending */}
                <button type="submit" disabled={Boolean(error) || submitting} style={button(Boolean(error) || submitting)}>
                  {submitting ? t('forgot.submitting') : t('forgot.submit')}
                </button>
              </fieldset>
              {/* Row 5 */}
              <p style={{ fontSize: '0.875rem', marginTop: '1rem', color: C.muted }}>
                {t('forgot.remembered')} <a href="/login" style={link}>{t('forgot.back')}</a>
              </p>
              {/* Error state: the email could not be sent */}
              {failed ? <p role="alert" style={fieldError}>{t('forgot.error.send')}</p> : null}
            </form>
          )}
        </section>

        <aside style={{ flex: '1 1 20rem', maxWidth: '30rem', minWidth: 0 }}>
          {/* Row 6: what happens next */}
          <section style={{ ...panel, marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.125rem', margin: '0 0 0.75rem' }}>{t('forgot.next.title')}</h2>
            <ol style={{ margin: '0 0 0.75rem', paddingLeft: '1.25rem', lineHeight: 1.7 }}>
              <li>{t('forgot.next.step1')}</li>
              <li>{t('forgot.next.step2')}</li>
              <li>{t('forgot.next.step3')}</li>
            </ol>
            <p style={{ color: C.muted, fontSize: '0.875rem', margin: 0 }}>{t('forgot.next.note')}</p>
          </section>
          {/* Row 7: help when the email is lost (SC-33 booking form not built yet) */}
          <section style={{ ...card }}>
            <h2 style={{ fontSize: '1.125rem', margin: '0 0 0.5rem' }}>{t('forgot.help.title')}</h2>
            <p style={{ margin: 0, color: C.text }}>{t('forgot.help.text')}</p>
          </section>
        </aside>
      </div>
    </AuthFrame>
  );
}
