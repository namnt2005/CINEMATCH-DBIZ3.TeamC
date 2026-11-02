// Terms consent (BR-003). Only the current version is needed by sign-up so far; getConsents and
// acceptConsent come with SC-08 / SC-43 (specs/003-sys-core T063).

// Interim: the newest version in data/seed (account `park` re-consented to it, data/seed/README.md).
// SC-43 row 3 shows this value; VFDA Legal to confirm it (research Open question 10, spec questions 11–12).
export const CURRENT_CONSENT_VERSION = '2026.2';

export function currentConsentVersion() {
  return CURRENT_CONSENT_VERSION;
}
