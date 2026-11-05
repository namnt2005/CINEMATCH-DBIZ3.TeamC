// The consultation request email to VFDA (M7 FR-005, BR-005, R8), sent by the System actor through Resend.
// The caller records the outcome in email_delivery. The API key never reaches a message, a log line or a result.
import { Resend } from 'resend';
import en from '../i18n/en.json' with { type: 'json' };
import { formatInZone, HANOI } from '../consultations/time.js';

let testClient = null;
/** Tests only: a fake `{ emails: { send } }` used instead of Resend (null restores the real client). */
export function setResendClientForTests(client) { testClient = client; }

const QUEUED = Object.freeze({ status: 'queued', provider_message_id: null });
const BOUNCED = Object.freeze({ status: 'bounced', provider_message_id: null });
const topicLabel = (topic) => en[`consult.topic.${topic}`] ?? topic;

function body(request, member) {
  const times = request.preferred_times.map((t, i) =>
    `${i + 1}. ${formatInZone(t, request.timezone)} (${request.timezone}) — ${formatInZone(t, HANOI)} (${HANOI})`);
  return [
    'A CINEMATCH member asks VFDA for a consultation. Reply to this email with a proposed time.',
    '',
    `Topic: ${topicLabel(request.topic)}`,
    `Member: ${member.full_name || '—'} <${member.email}>`,
    `Organisation: ${member.org_name || '—'}`,
    `Member's time zone: ${request.timezone}`,
    '',
    'Preferred times:',
    ...times,
    '',
    `Request ID: ${request.booking_id}`
  ].join('\n');
}

/** Sends one email; returns { status: sent | bounced | queued, provider_message_id }. Never throws. */
export async function sendConsultationRequest({ request, member }, { client, env = process.env } = {}) {
  const key = env.RESEND_API_KEY;
  const to = env.VFDA_CONSULT_EMAIL;
  const from = env.EMAIL_FROM;
  if (!key || !to || !from) return { ...QUEUED };
  const redact = (text) => String(text ?? '').split(key).join('[redacted]');
  try {
    const resend = client ?? testClient ?? new Resend(key);
    const { data, error } = await resend.emails.send({
      from, to: [to], replyTo: member.email,
      subject: `Consultation request — ${topicLabel(request.topic)}`,
      text: body(request, member)
    });
    if (error || !data?.id) {
      console.warn(`[email] consultation request ${request.booking_id} not sent: ${redact(error?.name || 'no id')}`);
      return { ...BOUNCED };
    }
    return { status: 'sent', provider_message_id: data.id };
  } catch (err) {
    console.warn(`[email] consultation request ${request.booking_id} not sent: ${redact(err?.name || 'error')}`);
    return { ...BOUNCED };
  }
}
