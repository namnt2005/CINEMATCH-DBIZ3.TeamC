// FR-015 on node:sqlite: one notification for each party of a request, then the queued emails are handed to Resend.
import { query } from '../client.js';
import { notify } from './notifications.js';
import { deliverQueued } from '../../email/resend.js';

/** The users of the organisation and the accepted members of the project. */
export function partiesOf(request) {
  const partner = query('SELECT user_id FROM organisation_user WHERE org_id = ?', [request.org_id]).map(r => r.user_id);
  const producer = query("SELECT user_id FROM project_member WHERE project_id = ? AND invite_status = 'accepted' AND user_id IS NOT NULL AND user_id <> ''", [request.project_id]).map(r => r.user_id);
  return { partner, producer };
}

/** Notifies the given users and sends their queued emails; the outcome is written on each email_delivery row (C1). */
export async function notifyUsers(userIds, eventType, payload) {
  const ids = [];
  for (const recipientId of [...new Set(userIds)]) ids.push(notify({ recipientId, eventType, payload }).notification_id);
  if (!ids.length) return;
  const rows = query(`SELECT * FROM email_delivery WHERE delivery_status = 'queued' AND notification_id IN (${ids.map(() => '?').join(',')})`, ids);
  const outcome = await deliverQueued(rows);
  for (const o of outcome) {
    if (o.status !== 'queued') query('UPDATE email_delivery SET delivery_status = ?, provider_message_id = ? WHERE email_delivery_id = ?', [o.status, o.provider_message_id, o.email_delivery_id]);
  }
}

/** Every status change: one notification for each party (FR-015, analysis I2). */
export async function notifyParties(request, eventType, payload) {
  const { partner, producer } = partiesOf(request);
  await notifyUsers([...partner, ...producer], eventType, payload);
}
