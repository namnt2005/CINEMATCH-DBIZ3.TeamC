'use client';
// Client side of the dictionary. The server page passes its locale and messages, so the browser bundle
// never loads both dictionaries (contracts/i18n.contract.md).
import { createContext, useContext, useMemo } from 'react';
import { translate } from './index.js';
import { switchLocale } from './switch.js';

const I18nContext = createContext({ locale: 'vi', messages: {}, signedIn: false });

export function I18nProvider({ locale, messages, signedIn = false, children }) {
  const value = useMemo(() => ({ locale, messages, signedIn }), [locale, messages, signedIn]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale() {
  return useContext(I18nContext).locale;
}

export function useSignedIn() {
  return useContext(I18nContext).signedIn;
}

export function useT() {
  const { messages } = useContext(I18nContext);
  return (key, vars) => translate(messages, key, vars);
}

/** Switches the language for this browser (and the profile when signed in), then re-renders in place. */
export function setLocale(locale, router, { signedIn = false } = {}) {
  return switchLocale(locale, {
    signedIn,
    writeCookie: (cookie) => { document.cookie = cookie; },
    fetchImpl: (...args) => fetch(...args),
    refresh: () => router.refresh()
  });
}
