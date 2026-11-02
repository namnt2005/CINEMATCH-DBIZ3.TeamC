'use client';
// Client side of the dictionary. The server page passes its locale and messages, so the browser bundle
// never loads both dictionaries (contracts/i18n.contract.md).
import { createContext, useContext, useMemo } from 'react';
import { translate, LOCALE_COOKIE } from './index.js';

const I18nContext = createContext({ locale: 'vi', messages: {} });

export function I18nProvider({ locale, messages, children }) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale() {
  return useContext(I18nContext).locale;
}

export function useT() {
  const { messages } = useContext(I18nContext);
  return (key, vars) => translate(messages, key, vars);
}

/**
 * Remembers the language for one year and re-renders the server components without a full reload,
 * so typed values and the scroll position stay (US-3 Scenario 1). Saving profile.locale comes with SC-08.
 */
export function setLocale(locale, router) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  router.refresh();
}
