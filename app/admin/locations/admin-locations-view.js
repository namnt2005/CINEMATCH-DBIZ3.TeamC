/**
 * Pure view helpers for SC-35 (docs/screens/screen-spec-SC-35.md §3), kept out of the page so
 * they can be tested with node --test.
 */

export const STATUS_LABELS = { awaiting_contact: 'Awaiting contact', published: 'Published', unpublished: 'Unpublished' };

// SR-316, M3 BR-010
export const AVAILABILITY_LABELS = { open: 'Open', survey_in_progress: 'Scouting crew on site', paused: 'Temporarily closed' };

export const statusLabel = (status) => STATUS_LABELS[status] || status;

export const availabilityLabel = (availability) => AVAILABILITY_LABELS[availability] || availability;

/**
 * SC-35 #11: the row action of each status. There is no Delete (BR-008, SR-312);
 * Unpublish needs a confirmation dialog.
 */
export function rowAction(status) {
  if (status === 'published') return { label: 'Unpublish', action: 'unpublish', confirm: true };
  if (status === 'unpublished') return { label: 'Publish again', action: 'publish', confirm: false };
  return { label: 'Edit', action: 'edit', confirm: false };
}

/** SC-35 #23, #25 / SR-311: Publish is disabled, with its reason, while the contact is not verified. */
export function publishState(location) {
  if (location.intake_status === 'published') return { disabled: true, reason: 'Already published.' };
  if (!location.can_publish) {
    return { disabled: true, reason: location.blocked_reason || 'Authority contact not verified (M3 BR-004).' };
  }
  return { disabled: false, reason: null };
}

/** SC-35 #9: "✓ verified by {name}, DD/MM/YYYY", "Not verified" or "No contact recorded". */
export function verifiedLine(contact) {
  if (!contact) return 'No contact recorded';
  if (!contact.contact_verified) return 'Not verified';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(contact.verified_at || ''));
  const date = match ? `${match[3]}/${match[2]}/${match[1]}` : '';
  return `✓ verified by ${contact.verified_by_name || 'VFDA staff'}${date ? `, ${date}` : ''}`;
}
