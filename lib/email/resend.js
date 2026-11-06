// The consultation request email to VFDA (M7 FR-005, BR-005, R8), sent by the System actor through Resend.
// The caller records the outcome in email_delivery. The API key never reaches a message, a log line or a result.
import { Resend } from 'resend';
import en from '../i18n/en.json' with { type: 'json' };
import vi from '../i18n/vi.json' with { type: 'json' };
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

// ---- Notification emails (M4 FR-015, specs/007-m4-partners R13) -----------------------------------------
const VARIABLE_LABELS = { project: ['Dự án', 'Project'], organisation: ['Tổ chức', 'Organisation'], status: ['Trạng thái', 'Status'],
  reason: ['Lý do', 'Reason'], verified_until: ['Hiệu lực đến', 'Valid until'] };
const eventLabel = (dict, template) => dict[`notification.event.${template}`] ?? dict['notification.event.other'] ?? template;

function notificationText(template, variables) {
  const lines = [`${eventLabel(vi, template)}`, `${eventLabel(en, template)}`, ''];
  for (const [key, [labelVi, labelEn]] of Object.entries(VARIABLE_LABELS)) {
    if (variables?.[key]) lines.push(`${labelVi} / ${labelEn}: ${variables[key]}`);
  }
  lines.push('', 'CINEMATCH — thông báo tự động. Automatic notification.');
  return lines.join('\n');
}

/**
 * Sends queued notification emails once each (System actor) and returns their outcome — sent with the provider id,
 * bounced on a provider error, queued when email is not set up. Never throws; the key reaches no log or result.
 */
export async function deliverQueued(deliveryRows, { client, env = process.env } = {}) {
  const key = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  const outcome = (row, status, id = null) => ({ email_delivery_id: row.email_delivery_id, notification_id: row.notification_id ?? null, status, provider_message_id: id });
  if (!key || !from) return deliveryRows.map(row => outcome(row, 'queued'));
  const redact = (text) => String(text ?? '').split(key).join('[redacted]');
  const resend = client ?? testClient ?? new Resend(key);
  const results = [];
  for (const row of deliveryRows) {
    const variables = typeof row.variables === 'string' ? JSON.parse(row.variables || '{}') : (row.variables || {});
    try {
      const { data, error } = await resend.emails.send({
        from, to: [row.recipient_email],
        subject: `CINEMATCH — ${eventLabel(en, row.template_id)}`,
        text: notificationText(row.template_id, variables)
      });
      if (error || !data?.id) {
        console.warn(`[email] ${row.template_id} ${row.email_delivery_id} not sent: ${redact(error?.name || 'no id')}`);
        results.push(outcome(row, 'bounced'));
      } else {
        results.push(outcome(row, 'sent', data.id));
      }
    } catch (err) {
      console.warn(`[email] ${row.template_id} ${row.email_delivery_id} not sent: ${redact(err?.name || 'error')}`);
      results.push(outcome(row, 'bounced'));
    }
  }
  return results;
}

// ---- Partner invitation (M4 BR-003, D2) -----------------------------------------------------------------
/**
 * Sends the one-time invitation link to the invited address (System actor). Returns sent | bounced | queued and the
 * provider id. Never throws; neither the key nor the link (it holds the code) reaches a log line or the result.
 */
export async function sendPartnerInvitation({ email, org_name: orgName, link, expires_at: expiresAt }, { client, env = process.env } = {}) {
  const key = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  if (!key || !from) return { ...QUEUED };
  const redact = (text) => String(text ?? '').split(key).join('[redacted]').split(link).join('[link]');
  const until = expiresAt ? String(expiresAt).slice(0, 10) : '';
  const text = [
    `${vi['invitations.email.intro']} ${orgName}.`,
    `${en['invitations.email.intro']} ${orgName}.`,
    '',
    link,
    '',
    `${vi['invitations.email.expiry']} ${until}`,
    `${en['invitations.email.expiry']} ${until}`,
    '',
    vi['invitations.email.ignore'],
    en['invitations.email.ignore']
  ].join('\n');
  try {
    const resend = client ?? testClient ?? new Resend(key);
    const { data, error } = await resend.emails.send({ from, to: [email], subject: `CINEMATCH — ${en['invitations.email.subject']}`, text });
    if (error || !data?.id) {
      console.warn(`[email] partner invitation not sent: ${redact(error?.name || 'no id')}`);
      return { ...BOUNCED };
    }
    return { status: 'sent', provider_message_id: data.id };
  } catch (err) {
    console.warn(`[email] partner invitation not sent: ${redact(err?.name || 'error')}`);
    return { ...BOUNCED };
  }
}
