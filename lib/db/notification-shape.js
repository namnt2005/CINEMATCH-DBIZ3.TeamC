// Shared by both sources of lib/db/notifications.js (FR-007..FR-009, SC-09).
export const PAGE_SIZE = 20; // SC-09 Default state: up to 20, then "Show older notifications"

/** payload is JSONB on Supabase and JSON text in node:sqlite. */
export function payloadOf(value) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || '{}'); } catch { return {}; }
}

export const asNotification = (r) => ({
  notification_id: r.notification_id,
  recipient_id: r.recipient_id,
  event_type: r.event_type,
  payload: payloadOf(r.payload),
  created_at: r.created_at,
  read_at: r.read_at || null
});

/** Read-request body: { ids: [uuid] } or { all: true } (contracts/notifications.contract.md). */
export function readTarget(body) {
  if (body?.all === true) return { all: true };
  if (Array.isArray(body?.ids) && body.ids.length > 0 && body.ids.every(id => typeof id === 'string')) return { ids: body.ids };
  return null;
}
