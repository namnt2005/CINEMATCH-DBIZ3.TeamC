import { randomUUID } from 'node:crypto';
import { query, getOne } from '../client.js';
import { ProjectError } from '../project-shape.js';
import { validateConsultationRequest } from '../../consultations/input.js';
import { shapeRequest, sortRequests } from '../../consultations/requests.js';

// node:sqlite twin of app_request_consultation (20261106000100_m7_notices.sql) and the member's own list.

function activeAccount(session) {
  if (!session?.isAuthenticated || !session.userId) throw new ProjectError('UNAUTHENTICATED');
  const account = getOne('SELECT account_status FROM user_account WHERE user_id = ?', [session.userId]);
  if (!account || account.account_status === 'deactivated') throw new ProjectError('FORBIDDEN'); // SC-33 SR-364
  return session.userId;
}

/** BR-005: stores the request — slot_start = the first preferred time; officer and status stay empty. */
export function requestConsultation(session, input) {
  const memberId = activeAccount(session);
  const { ok, value } = validateConsultationRequest(input);
  if (!ok) throw new ProjectError('VALIDATION_ERROR');
  const bookingId = randomUUID();
  query(`INSERT INTO consultation_booking (booking_id, member_id, topic, preferred_times, slot_start, timezone, officer_id, booking_status)
    VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
  [bookingId, memberId, value.topic, JSON.stringify(value.preferred_times), value.slot_start, value.timezone]);
  return { booking_id: bookingId };
}

export function listConsultations(session) {
  if (!session?.isAuthenticated || !session.userId) throw new ProjectError('UNAUTHENTICATED');
  const list = query('SELECT * FROM consultation_booking WHERE member_id = ?', [session.userId]).map(shapeRequest);
  return { requests: sortRequests(list) };
}

/** Name, organisation and account email of the member, for the email to VFDA (System read). */
export function getMemberContact(userId) {
  const row = getOne(`SELECT u.email, p.full_name, o.org_name FROM user_account u
    LEFT JOIN profile p ON p.user_id = u.user_id LEFT JOIN producer_organisation o ON o.producer_org_id = p.producer_org_id
    WHERE u.user_id = ?`, [userId]);
  return row ? { email: row.email, full_name: row.full_name ?? null, org_name: row.org_name ?? null } : null;
}

/** R8: one email_delivery row for the request email (no notification behind it). */
export function recordConsultationEmail({ booking_id, recipient_email, delivery_status, provider_message_id = null }) {
  query(`INSERT INTO email_delivery (email_delivery_id, notification_id, template_id, recipient_email, variables, delivery_status, provider_message_id)
    VALUES (?, NULL, 'consultation.request', ?, ?, ?, ?)`,
  [randomUUID(), recipient_email, JSON.stringify({ booking_id }), delivery_status, provider_message_id]);
}
