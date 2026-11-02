// Server side of the dictionary: the locale of the current request (contracts/i18n.contract.md).
import { dictionary, pickLocale, translate, LOCALE_COOKIE } from './index.js';

export async function getLocale() {
  const { cookies, headers } = await import('next/headers.js');
  return pickLocale(cookies().get(LOCALE_COOKIE)?.value, headers().get('accept-language'));
}

/** { locale, messages, t } for a server component; pass locale and messages to <I18nProvider>. */
export async function getI18n() {
  const locale = await getLocale();
  const messages = dictionary(locale);
  return { locale, messages, t: (key, vars) => translate(messages, key, vars) };
}
