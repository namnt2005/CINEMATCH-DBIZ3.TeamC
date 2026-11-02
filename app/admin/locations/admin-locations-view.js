/**
 * Pure view helpers for SC-35 (docs/screens/screen-spec-SC-35.md §3), kept out of the page so
 * they can be tested with node --test. Each takes the page's translator; without one they read English,
 * the language of the earlier screen and its tests. Every text comes from the dictionary (FR-006).
 */
import { dictionary, translate } from '../../../lib/i18n/index.js';
import { BLOCKED_REASON } from '../../../lib/admin/errors.js';

const EN = (key, vars) => translate(dictionary('en'), key, vars);

export const statusLabel = (status, t = EN) => (status ? t(`admin.status.${status}`) : '');

// SR-316, M3 BR-010
export const availabilityLabel = (availability, t = EN) => (availability ? t(`availability.${availability}`) : '');

/**
 * SC-35 #11: the row action of each status. There is no Delete (BR-008, SR-312);
 * Unpublish needs a confirmation dialog.
 */
export function rowAction(status, t = EN) {
  if (status === 'published') return { label: t('admin.action.unpublish'), action: 'unpublish', confirm: true };
  if (status === 'unpublished') return { label: t('admin.action.publish_again'), action: 'publish', confirm: false };
  return { label: t('admin.action.edit'), action: 'edit', confirm: false };
}

/** SC-35 #23, #25 / SR-311: Publish is disabled, with its reason, while the contact is not verified. */
export function publishState(location, t = EN) {
  if (location.intake_status === 'published') return { disabled: true, reason: t('admin.publish.already') };
  if (!location.can_publish) {
    // The stored reason of BR-004 is a known text; any other reason is what staff typed when unpublishing
    const stored = location.blocked_reason;
    return { disabled: true, reason: !stored || stored === BLOCKED_REASON ? t('admin.publish.blocked_contact') : stored };
  }
  return { disabled: false, reason: null };
}

/** SC-35 #9: "✓ verified by {name}, DD/MM/YYYY", "Not verified" or "No contact recorded". */
export function verifiedLine(contact, t = EN) {
  if (!contact) return t('admin.contact.none');
  if (!contact.contact_verified) return t('admin.contact.not_verified');
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(contact.verified_at || ''));
  const name = contact.verified_by_name || t('admin.contact.staff');
  return match
    ? t('admin.contact.verified_on', { name, date: `${match[3]}/${match[2]}/${match[1]}` })
    : t('admin.contact.verified', { name });
}
