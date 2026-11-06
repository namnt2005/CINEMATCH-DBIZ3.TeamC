import { randomUUID } from 'node:crypto';
import { query, getOne, withTransaction } from '../client.js';
import { nowInVietnam } from '../audit.js';
import { PartnerError } from '../../partners/errors.js';
import { transition, OPEN_STATUSES } from '../../partners/lifecycle.js';
import { SERVICE_GROUPS } from '../../partners/service-groups.js';
import { NDA_VERSION } from '../../partners/nda.js';
import { shapeRequest, listItem, sortItems } from '../../partners/request-shape.js';
import { userOf, isOrgUser, permissionOf, ndaOf, asOrg, orgsOfUser } from './partner-access.js';
import { notifyParties, partiesOf, notifyUsers } from './partner-notify.js';

// node:sqlite twin of the collaboration-request functions of supabase/migrations/20261106000200_m4_partners.sql
// (FR-012..FR-017, BR-005, BR-009): the same checks in the same order; the triggers keep final rows and messages.

const EDITORS = ['owner', 'edit'];
// Messages written in the same millisecond keep their order (SC-25 #7)
let lastStamp = '';
function stamp() {
  let now = nowInVietnam();
  if (now <= lastStamp) now = new Date(Date.parse(lastStamp) + 1 + 7 * 3600 * 1000).toISOString().replace('Z', '+07:00');
  lastStamp = now;
  return now;
}
function requestRow(requestId) {
  const r = getOne('SELECT * FROM collab_request WHERE request_id = ?', [requestId]);
  if (!r) throw new PartnerError('NOT_FOUND');
  return r;
}
const fail = (result) => { if (result.error) throw new PartnerError(result.error); return result.to; };
function sideOf(session, r) {
  if (EDITORS.includes(permissionOf(session, r.project_id)) && session.role === 'member') return 'producer';
  if (isOrgUser(session, r.org_id)) return 'partner';
  return null;
}
const payloadOf = (r) => ({ request_id: r.request_id, project: getOne('SELECT project_name FROM project WHERE project_id = ?', [r.project_id])?.project_name ?? null,
  organisation: getOne('SELECT org_name FROM organisation WHERE org_id = ?', [r.org_id])?.org_name ?? null, status: r.status });
const addMessage = (db, requestId, authorId, body) =>
  db.prepare('INSERT INTO collab_message (message_id, request_id, author_id, created_at, body) VALUES (?, ?, ?, ?, ?)').run(randomUUID(), requestId, authorId, stamp(), body);

export async function sendRequest(session, { project_id: projectId, org_id: orgId, services, note }) {
  if (!getOne('SELECT 1 AS x FROM project WHERE project_id = ?', [projectId])) throw new PartnerError('NOT_FOUND');
  if (!EDITORS.includes(permissionOf(session, projectId)) || session.role !== 'member') throw new PartnerError('FORBIDDEN');
  if (getOne('SELECT stage FROM project WHERE project_id = ?', [projectId])?.stage === 'archived') throw new PartnerError('ARCHIVED');
  const org = getOne('SELECT org_status FROM organisation WHERE org_id = ?', [orgId]);
  if (!org) throw new PartnerError('NOT_FOUND');
  if (org.org_status === 'deactivated') throw new PartnerError('ORG_DEACTIVATED');
  if (!Array.isArray(services) || !services.length || services.some(s => !SERVICE_GROUPS.includes(s)) || (note || '').length > 1000) throw new PartnerError('VALIDATION_ERROR');
  if (getOne(`SELECT 1 AS x FROM collab_request WHERE project_id = ? AND org_id = ? AND status IN (${OPEN_STATUSES.map(() => '?').join(',')})`, [projectId, orgId, ...OPEN_STATUSES])) {
    throw new PartnerError('OPEN_REQUEST_EXISTS');
  }
  const requestId = randomUUID();
  query(`INSERT INTO collab_request (request_id, project_id, org_id, services, note, status, response_note, sent_at, responded_at, confirmed_at)
    VALUES (?, ?, ?, ?, ?, 'pending', NULL, ?, NULL, NULL)`, [requestId, projectId, orgId, JSON.stringify(services), note || null, nowInVietnam()]);
  const r = requestRow(requestId);
  await notifyParties(r, 'collab_request.new', payloadOf(r));
  return { request_id: requestId, status: 'pending', step: 1 };
}

export async function respond(session, requestId, { decision, note = null, nda_accepted: ndaAccepted = false }) {
  const r = requestRow(requestId);
  if (!isOrgUser(session, r.org_id)) throw new PartnerError('FORBIDDEN');
  const to = fail(transition(r.status, 'respond', { side: 'partner', decision, ndaAccepted }));
  if ((note || '').length > 2000) throw new PartnerError('VALIDATION_ERROR');
  withTransaction((db) => {
    db.prepare('UPDATE collab_request SET status = ?, response_note = COALESCE(?, response_note), responded_at = COALESCE(NULLIF(responded_at, \'\'), ?) WHERE request_id = ?')
      .run(to, note || null, nowInVietnam(), requestId);
    if (note) addMessage(db, requestId, userOf(session), note);
    if (to === 'accepted') {
      db.prepare("INSERT INTO nda_acceptance (nda_acceptance_id, request_id, party, nda_version, accepted, accepted_at) VALUES (?, ?, 'partner', ?, 'true', ?)")
        .run(randomUUID(), requestId, NDA_VERSION, nowInVietnam());
    }
  });
  const after = requestRow(requestId);
  await notifyParties(after, `collab_request.${to}`, payloadOf(after));
  return { request_id: requestId, status: to };
}

export async function acceptNda(session, requestId, { nda_version: version, accepted } = {}) {
  const r = requestRow(requestId);
  if (!EDITORS.includes(permissionOf(session, r.project_id)) || session.role !== 'member') throw new PartnerError('FORBIDDEN');
  if (r.status !== 'accepted') throw new PartnerError('INVALID_STATE');
  if (accepted !== true || version !== NDA_VERSION) throw new PartnerError('VALIDATION_ERROR');
  if (!ndaOf(requestId).producer) {
    query("INSERT INTO nda_acceptance (nda_acceptance_id, request_id, party, nda_version, accepted, accepted_at) VALUES (?, ?, 'producer', ?, 'true', ?)",
      [randomUUID(), requestId, version, nowInVietnam()]);
  }
  return { request_id: requestId, producer: true };
}

export async function confirm(session, requestId) {
  const r = requestRow(requestId);
  const side = sideOf(session, r);
  if (!side) throw new PartnerError(permissionOf(session, r.project_id) ? 'FORBIDDEN' : 'NOT_FOUND');
  fail(transition(r.status, 'confirm', { side, producerNda: ndaOf(requestId).producer }));
  const at = nowInVietnam();
  query("UPDATE collab_request SET status = 'confirmed', confirmed_at = ? WHERE request_id = ?", [at, requestId]);
  const after = requestRow(requestId);
  await notifyParties(after, 'collab_request.confirmed', payloadOf(after));
  return { request_id: requestId, status: 'confirmed', confirmed_at: at };
}

export async function withdraw(session, requestId, { note = null } = {}) {
  const r = requestRow(requestId);
  const side = sideOf(session, r);
  if (!side) throw new PartnerError(permissionOf(session, r.project_id) ? 'FORBIDDEN' : 'NOT_FOUND');
  fail(transition(r.status, 'withdraw', { side }));
  withTransaction((db) => {
    db.prepare("UPDATE collab_request SET status = 'withdrawn' WHERE request_id = ?").run(requestId);
    if (note) addMessage(db, requestId, userOf(session), note);
  });
  const after = requestRow(requestId);
  await notifyParties(after, 'collab_request.withdrawn', payloadOf(after));
  return { request_id: requestId, status: 'withdrawn' };
}

export async function postMessage(session, requestId, { body }) {
  const r = requestRow(requestId);
  const side = sideOf(session, r);
  if (!side) throw new PartnerError(permissionOf(session, r.project_id) ? 'FORBIDDEN' : 'NOT_FOUND');
  const text = String(body || '').trim();
  if (text.length < 1 || text.length > 2000) throw new PartnerError('VALIDATION_ERROR');
  const messageId = randomUUID();
  const at = stamp();
  query('INSERT INTO collab_message (message_id, request_id, author_id, created_at, body) VALUES (?, ?, ?, ?, ?)', [messageId, requestId, userOf(session), at, text]);
  const { partner, producer } = partiesOf(r);
  await notifyUsers((side === 'partner' ? producer : partner).filter(id => id !== userOf(session)), 'collab_message.posted', payloadOf(r));
  return { message_id: messageId, created_at: at };
}

function messagesOf(r) {
  const partnerUsers = new Set(query('SELECT user_id FROM organisation_user WHERE org_id = ?', [r.org_id]).map(x => x.user_id));
  return query(`SELECT m.message_id, m.author_id, m.body, m.created_at, p.full_name FROM collab_message m
    LEFT JOIN profile p ON p.user_id = m.author_id WHERE m.request_id = ? ORDER BY m.created_at, m.message_id`, [r.request_id])
    .map(m => ({ message_id: m.message_id, author: partnerUsers.has(m.author_id) ? 'partner' : 'producer', author_name: m.full_name ?? null, body: m.body, created_at: m.created_at }));
}

export async function getRequest(session, requestId) {
  const r = getOne('SELECT * FROM collab_request WHERE request_id = ?', [requestId]);
  if (!r) throw new PartnerError('NOT_FOUND');
  const member = Boolean(permissionOf(session, r.project_id));
  const partner = isOrgUser(session, r.org_id);
  if (!member && !partner) throw new PartnerError('NOT_FOUND');
  const project = getOne('SELECT * FROM project WHERE project_id = ?', [r.project_id]);
  const org = asOrg(getOne('SELECT * FROM organisation WHERE org_id = ?', [r.org_id]));
  const slot = getOne("SELECT state FROM document_slot WHERE project_id = ? AND doc_code = 'A13_SERVICE_AGREEMENT'", [r.project_id])?.state ?? null;
  const confirmed = Boolean(getOne("SELECT 1 AS x FROM collab_request WHERE project_id = ? AND status = 'confirmed'", [r.project_id]));
  return shapeRequest({ request: r, project, org, messages: messagesOf(r), nda: ndaOf(requestId), side: sideOf(session, r), slotState: slot, projectHasConfirmed: confirmed });
}

function items(rows) {
  return rows.map(r => listItem({ request: r, project: getOne('SELECT project_id, project_name FROM project WHERE project_id = ?', [r.project_id]),
    org: asOrg(getOne('SELECT slug, org_name FROM organisation WHERE org_id = ?', [r.org_id])), nda: ndaOf(r.request_id),
    lastMessageAt: getOne('SELECT MAX(created_at) AS at FROM collab_message WHERE request_id = ?', [r.request_id])?.at ?? null }));
}

export async function listRequests(session, { project_id: projectId = null, direction = null } = {}) {
  if (!userOf(session)) throw new PartnerError('UNAUTHENTICATED');
  if (projectId) {
    if (!permissionOf(session, projectId)) throw new PartnerError('NOT_FOUND');
    return { requests: sortItems(items(query('SELECT * FROM collab_request WHERE project_id = ?', [projectId]))) };
  }
  if (direction === 'incoming') {
    if (session.role !== 'partner') throw new PartnerError('FORBIDDEN');
    const orgs = orgsOfUser(session);
    const rows = orgs.length ? query(`SELECT * FROM collab_request WHERE org_id IN (${orgs.map(() => '?').join(',')})`, orgs) : [];
    return { requests: sortItems(items(rows), { openFirst: true }) };
  }
  if (session.role !== 'member') throw new PartnerError('FORBIDDEN');
  const rows = query(`SELECT r.* FROM collab_request r JOIN project_member pm ON pm.project_id = r.project_id
    WHERE pm.user_id = ? AND pm.invite_status = 'accepted'`, [userOf(session)]);
  return { requests: sortItems(items(rows)) };
}
