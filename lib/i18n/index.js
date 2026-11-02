// Display dictionary (FR-005, FR-006; specs/003-sys-core contracts/i18n.contract.md). Pure: no request access.
// vi.json and en.json hold the same flat dotted keys; `{name}` placeholders are filled from vars.
import vi from './vi.json' with { type: 'json' };
import en from './en.json' with { type: 'json' };

export const LOCALES = Object.freeze(['vi', 'en']);
export const DEFAULT_LOCALE = 'vi';
export const LOCALE_COOKIE = 'locale';

const DICTIONARIES = { vi, en };

export const isLocale = (value) => LOCALES.includes(value);

export function dictionary(locale) {
  return DICTIONARIES[isLocale(locale) ? locale : DEFAULT_LOCALE];
}

/** The text of `key` in `locale`; a missing key shows the key itself (the build check catches it, FR-006). */
export function translate(messages, key, vars) {
  const text = messages[key] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] === undefined ? match : String(vars[name])));
}

/** Cookie `locale` first, then the first supported language of Accept-Language, then Vietnamese. */
export function pickLocale(cookieValue, acceptLanguage) {
  if (isLocale(cookieValue)) return cookieValue;
  for (const part of String(acceptLanguage || '').split(',')) {
    const lang = part.trim().split(';')[0].slice(0, 2).toLowerCase();
    if (isLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

/** English text for API bodies: screens show the user's language from the error code. */
export const apiMessage = (key, vars) => translate(en, key, vars);
