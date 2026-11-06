import { userDb, systemDb, rows } from './util.js';
import { PartnerError, rpcData } from '../../partners/errors.js';
import { NDA_VERSION } from '../../partners/nda.js';
import { shapeRequest, listItem, sortItems } from '../../partners/request-shape.js';
import { notifyParties, partiesOf, notifyUsers } from './partner-notify.js';

// Supabase source of collaboration requests. Writes go through the SECURITY DEFINER functions of
// 20261106000200_m4_partners.sql (R4); reads run as the user, so RLS decides which requests, messages and NDA rows
// come back. The project summary a partner sees on SC-25 is read by the System actor once RLS has shown the request.

const EDITORS = ['owner', 'edit'];
const truthy = (v) => v === true || v === 'true' || v === 1;

async function visibleRequest(requestId) {
  const db = await userDb();
  const r = rows(await db.from('collab_request').select('*').eq('request_id', requestId).maybeSingle());
  if (!r) throw new PartnerError('NOT_FOUND');
  return r;
}
async function payloadOf(r) {
  const system = await systemDb();
  const project = rows(await system.from('project').select('project_name').eq('project_id', r.project_id).maybeSingle());
  const org = rows(await system.from('organisation').select('org_name').eq('org_id', r.org_id).maybeSingle());
  return { request_id: r.request_id, project: project?.project_name ?? null, organisation: org?.org_name ?? null, status: r.status };
}
async function afterChange(requestId, eventType) {
  const system = await systemDb();
  const r = rows(await system.from('collab_request').select('*').eq('request_id', requestId).maybeSingle());
  if (r) await notifyParties(r, eventType, await payloadOf(r));
}

export async function sendRequest(session, { project_id: projectId, org_id: orgId, services, note }) {
  const db = await userDb();
  const out = rpcData(await db.rpc('app_send_collab_request', { p_project_id: projectId, p_org_id: orgId, p_services: services, p_note: note }));
  await afterChange(out.request_id, 'collab_request.new');
  return out;
}

export async function respond(session, requestId, { decision, note = null, nda_accepted: ndaAccepted = false }) {
  const db = await userDb();
  const out = rpcData(await db.rpc('app_respond_collab_request', { p_request_id: requestId, p_decision: decision, p_note: note, p_nda_accepted: ndaAccepted, p_nda_version: NDA_VERSION }));
  await afterChange(requestId, `collab_request.${decision}`);
  return out;
}

export async function acceptNda(session, requestId, { nda_version: version } = {}) {
  const db = await userDb();
  return rpcData(await db.rpc('app_accept_nda', { p_request_id: requestId, p_nda_version: version }));
}

export async function confirm(session, requestId) {
  const db = await userDb();
  const out = rpcData(await db.rpc('app_confirm_collab_request', { p_request_id: requestId }));
  await afterChange(requestId, 'collab_request.confirmed');
  return out;
}

export async function withdraw(session, requestId, { note = null } = {}) {
  const db = await userDb();
  const out = rpcData(await db.rpc('app_withdraw_collab_request', { p_request_id: requestId, p_note: note }));
  await afterChange(requestId, 'collab_request.withdrawn');
  return out;
}

export async function postMessage(session, requestId, { body }) {
  const db = await userDb();
  const out = rpcData(await db.rpc('app_post_collab_message', { p_request_id: requestId, p_body: body }));
  const system = await systemDb();
  const r = rows(await system.from('collab_request').select('*').eq('request_id', requestId).maybeSingle());
  if (r) {
    const { partner, producer } = await partiesOf(r);
    const other = partner.includes(session.userId) ? producer : partner;
    await notifyUsers(other.filter(id => id !== session.userId), 'collab_message.posted', await payloadOf(r));
  }
  return out;
}

async function sideOf(session, r) {
  const db = await userDb();
  const pm = rows(await db.from('project_member').select('permission, invite_status').eq('project_id', r.project_id).eq('user_id', session.userId).maybeSingle());
  if (pm && pm.invite_status === 'accepted' && EDITORS.includes(pm.permission) && session.role === 'member') return 'producer';
  const ou = session.role === 'partner' ? rows(await db.from('organisation_user').select('org_id').eq('org_id', r.org_id).eq('user_id', session.userId).maybeSingle()) : null;
  return ou ? 'partner' : null;
}

export async function getRequest(session, requestId) {
  const r = await visibleRequest(requestId);
  const db = await userDb();
  const system = await systemDb();
  const project = rows(await system.from('project').select('project_id, project_name, format, shoot_date, crew_size_band').eq('project_id', r.project_id).maybeSingle());
  const org = rows(await db.from('organisation').select('org_id, slug, org_name, verified_until, verified_at, art13_eligible').eq('org_id', r.org_id).maybeSingle());
  const ndaRows = rows(await db.from('nda_acceptance').select('party, accepted').eq('request_id', requestId)) || [];
  const nda = { producer: ndaRows.some(n => n.party === 'producer' && truthy(n.accepted)), partner: ndaRows.some(n => n.party === 'partner' && truthy(n.accepted)) };
  const partnerUsers = new Set((rows(await system.from('organisation_user').select('user_id').eq('org_id', r.org_id)) || []).map(x => x.user_id));
  const raw = rows(await db.from('collab_message').select('message_id, author_id, body, created_at').eq('request_id', requestId).order('created_at', { ascending: true })) || [];
  const authors = raw.length ? rows(await system.from('profile').select('user_id, full_name').in('user_id', [...new Set(raw.map(m => m.author_id))])) || [] : [];
  const nameOf = Object.fromEntries(authors.map(a => [a.user_id, a.full_name]));
  const messages = raw.map(m => ({ message_id: m.message_id, author: partnerUsers.has(m.author_id) ? 'partner' : 'producer', author_name: nameOf[m.author_id] ?? null, body: m.body, created_at: m.created_at }));
  const slot = rows(await system.from('document_slot').select('state').eq('project_id', r.project_id).eq('doc_code', 'A13_SERVICE_AGREEMENT').maybeSingle());
  const confirmed = (rows(await system.from('collab_request').select('request_id').eq('project_id', r.project_id).eq('status', 'confirmed')) || []).length > 0;
  return shapeRequest({ request: r, project, org, messages, nda, side: await sideOf(session, r), slotState: slot?.state ?? null, projectHasConfirmed: confirmed });
}

async function items(list) {
  const system = await systemDb();
  const out = [];
  for (const r of list) {
    const project = rows(await system.from('project').select('project_id, project_name').eq('project_id', r.project_id).maybeSingle());
    const org = rows(await system.from('organisation').select('slug, org_name').eq('org_id', r.org_id).maybeSingle());
    const ndaRows = rows(await system.from('nda_acceptance').select('party, accepted').eq('request_id', r.request_id)) || [];
    const last = (rows(await system.from('collab_message').select('created_at').eq('request_id', r.request_id).order('created_at', { ascending: false }).limit(1)) || [])[0];
    out.push(listItem({ request: r, project, org, nda: { producer: ndaRows.some(n => n.party === 'producer' && truthy(n.accepted)) }, lastMessageAt: last?.created_at ?? null }));
  }
  return out;
}

export async function listRequests(session, { project_id: projectId = null, direction = null } = {}) {
  if (!session?.isAuthenticated || !session.userId) throw new PartnerError('UNAUTHENTICATED');
  const db = await userDb();
  if (projectId) {
    const pm = rows(await db.from('project_member').select('invite_status').eq('project_id', projectId).eq('user_id', session.userId).maybeSingle());
    if (!pm || pm.invite_status !== 'accepted') throw new PartnerError('NOT_FOUND');
    return { requests: sortItems(await items(rows(await db.from('collab_request').select('*').eq('project_id', projectId)) || [])) };
  }
  if (direction === 'incoming') {
    if (session.role !== 'partner') throw new PartnerError('FORBIDDEN');
    const orgs = (rows(await db.from('organisation_user').select('org_id').eq('user_id', session.userId)) || []).map(o => o.org_id);
    const list = orgs.length ? rows(await db.from('collab_request').select('*').in('org_id', orgs)) || [] : [];
    return { requests: sortItems(await items(list), { openFirst: true }) };
  }
  if (session.role !== 'member') throw new PartnerError('FORBIDDEN');
  const projects = (rows(await db.from('project_member').select('project_id, invite_status').eq('user_id', session.userId)) || [])
    .filter(p => p.invite_status === 'accepted').map(p => p.project_id);
  const list = projects.length ? rows(await db.from('collab_request').select('*').in('project_id', projects)) || [] : [];
  return { requests: sortItems(await items(list)) };
}
