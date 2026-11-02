// Switching the interface language (FR-005, US-3 Scenario 1). Pure, so it is tested without a browser:
// the cookie is kept for a year, a signed-in user's choice is also saved to profile.locale, and the page
// is re-rendered in place (router.refresh), so typed values and the scroll position stay.
import { isLocale, LOCALE_COOKIE } from './index.js';

export const localeCookie = (locale) => `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;

export async function switchLocale(locale, { signedIn, writeCookie, fetchImpl, refresh }) {
  if (!isLocale(locale)) return;
  writeCookie(localeCookie(locale));
  if (signedIn) {
    // PATCH /api/account also sets the cookie on its answer; a failure keeps the cookie choice
    await fetchImpl('/api/account', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ locale })
    }).catch(() => null);
  }
  refresh();
}
