'use client';
// SC-42 / SC-43 row 4: the same version in the other language, re-rendered in place (scroll kept).
import { useRouter } from 'next/navigation';
import { useLocale, useSignedIn, useT, setLocale } from '../../../lib/i18n/client.js';

export default function LanguageChips() {
  const locale = useLocale();
  const signedIn = useSignedIn();
  const router = useRouter();
  const t = useT();
  const chip = (value) => (
    <button key={value} type="button" lang={value} aria-pressed={locale === value}
      onClick={() => locale !== value && setLocale(value, router, { signedIn })}
      style={{ border: `1px solid ${locale === value ? '#0f2d52' : '#d1d5db'}`, background: locale === value ? '#e8eef7' : '#fff', fontWeight: locale === value ? 700 : 400, borderRadius: '9999px', padding: '0.375rem 0.875rem', cursor: 'pointer', fontSize: '0.875rem' }}>
      {t(`legal.language.${value}`)}
    </button>
  );
  return <div role="group" aria-label={t('frame.language')} style={{ display: 'flex', gap: '0.5rem' }}>{['vi', 'en'].map(chip)}</div>;
}
