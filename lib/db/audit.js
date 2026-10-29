import { randomUUID } from 'node:crypto';

/**
 * Current time as ISO 8601 in Vietnam time (+07:00), the format of the seed timestamps, so the
 * calendar date shown on SC-35 / SC-16 (e.g. "verified 30/10/2026") is the Vietnamese date.
 */
export function nowInVietnam() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().replace('Z', '+07:00');
}

/**
 * Writes one audit_log row (M10 FR-008, SC-35 SR-317). Call it only inside withTransaction()
 * (lib/db/client.js), so the action and its record commit together or not at all (M10 BR-005).
 *
 * @param {import('node:sqlite').DatabaseSync} db the transaction's database
 * @param {{ action: string, adminId: string, targetId: string }} entry
 */
export function writeAudit(db, { action, adminId, targetId }) {
  db.prepare('INSERT INTO audit_log (audit_log_id, action, admin_id, target_id, logged_at) VALUES (?, ?, ?, ?, ?)')
    .run(randomUUID(), action, adminId, targetId, nowInVietnam());
}
