// FR-015 on Supabase: one notification for each party of a request (System actor), then the queued emails go to Resend.
import { systemDb, rows } from './util.js';
import { notify } from './notifications.js';
import { deliverQueued } from '../../email/resend.js';

export async function partiesOf(request) {
  const db = await systemDb();
  const partner = (rows(await db.from('organisation_user').select('user_id').eq('org_id', request.org_id)) || []).map(r => r.user_id);
  const producer = (rows(await db.from('project_member').select('user_id').eq('project_id', request.project_id).eq('invite_status', 'accepted')) || [])
    .map(r => r.user_id).filter(Boolean);
  return { partner, producer };
}

export async function notifyUsers(userIds, eventType, payload) {
  const ids = [];
  for (const recipientId of [...new Set(userIds)]) ids.push((await notify({ recipientId, eventType, payload })).notification_id);
  if (!ids.length) return;
  const db = await systemDb();
  const queued = rows(await db.from('email_delivery').select('*').in('notification_id', ids).eq('delivery_status', 'queued')) || [];
  for (const o of await deliverQueued(queued)) {
    if (o.status !== 'queued') rows(await db.from('email_delivery').update({ delivery_status: o.status, provider_message_id: o.provider_message_id }).eq('email_delivery_id', o.email_delivery_id));
  }
}

export async function notifyParties(request, eventType, payload) {
  const { partner, producer } = await partiesOf(request);
  await notifyUsers([...partner, ...producer], eventType, payload);
}
