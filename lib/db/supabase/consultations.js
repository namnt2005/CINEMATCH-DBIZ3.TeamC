import { randomUUID } from 'node:crypto';
import { userDb, systemDb, rows } from './util.js';
import { ProjectError, projectErrorCode } from '../project-shape.js';
import { sortRequests, shapeRequest } from '../../consultations/requests.js';

/*
 * The request is written by app_request_consultation (SECURITY DEFINER, 20261106000100_m7_notices.sql) as the user;
 * the list is read as the user, so RLS keeps each member to their own rows. The member's contact details and
 * the email_delivery row are the System actor's (003 D2).
 */
export async function requestConsultation(session, value) {
  if (!session?.isAuthenticated || !session.userId) throw new ProjectError('UNAUTHENTICATED');
  const db = await userDb();
  const { data, error } = await db.rpc('app_request_consultation', {
    p_topic: value.topic, p_timezone: value.timezone, p_preferred_times: value.preferred_times
  });
  if (error) {
    if (error.code === '42501') throw new ProjectError('FORBIDDEN');
    const code = projectErrorCode(error);
    if (code) throw new ProjectError(code);
    throw Object.assign(new Error(error.message), { code: error.code, cause: error });
  }
  return { booking_id: data };
}

export async function listConsultations(session) {
  if (!session?.isAuthenticated || !session.userId) throw new ProjectError('UNAUTHENTICATED');
  const db = await userDb();
  const list = rows(await db.from('consultation_booking')
    .select('booking_id, topic, timezone, preferred_times, slot_start, booking_status').eq('member_id', session.userId)) || [];
  return { requests: sortRequests(list.map(shapeRequest)) };
}

export async function getMemberContact(userId) {
  const system = await systemDb();
  const account = rows(await system.from('user_account').select('email').eq('user_id', userId).maybeSingle());
  if (!account) return null;
  const profile = rows(await system.from('profile').select('full_name, producer_org_id').eq('user_id', userId).maybeSingle());
  const org = profile?.producer_org_id
    ? rows(await system.from('producer_organisation').select('org_name').eq('producer_org_id', profile.producer_org_id).maybeSingle())
    : null;
  return { email: account.email, full_name: profile?.full_name ?? null, org_name: org?.org_name ?? null };
}

export async function recordConsultationEmail({ booking_id, recipient_email, delivery_status, provider_message_id = null }) {
  const system = await systemDb();
  rows(await system.from('email_delivery').insert({
    email_delivery_id: randomUUID(), notification_id: null, template_id: 'consultation.request', recipient_email,
    variables: { booking_id }, delivery_status, provider_message_id
  }));
}
