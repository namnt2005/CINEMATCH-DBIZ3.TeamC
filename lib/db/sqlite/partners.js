import { randomUUID } from 'node:crypto';
import { query, getOne, withTransaction } from '../client.js';
import { nowInVietnam, writeAudit } from '../audit.js';
import { PartnerError } from '../../partners/errors.js';
import { buildDirectory } from '../../partners/directory.js';
import { shapeProfile } from '../../partners/layers.js';
import { todayInVietnam } from '../../partners/badge.js';
import { userOf, canReadPrivate, asOrg, asMemberLayer, orgsOfUser, isOrgUser, isStaff } from './partner-access.js';
import { notifyParties } from './partner-notify.js';

// node:sqlite source of the partner directory and profiles (FR-002..FR-006, BR-001). Reads follow the twins of the
// Supabase read policies (partner-access.js): guests get no member layer, the private layer needs R3.

const signedIn = (session) => Boolean(userOf(session));

export function listDirectory(session, filters = {}, { today = todayInVietnam() } = {}) {
  const orgs = query('SELECT * FROM organisation').map(asOrg);
  const members = signedIn(session) ? query('SELECT * FROM organisation_member_layer').map(asMemberLayer) : [];
  const f = { q: filters.q || '', group: filters.group || null, province: filters.province ?? null, language: filters.language || null,
    verified_only: filters.verified_only !== false };
  return buildDirectory(orgs, members, f, { today, signedIn: signedIn(session) });
}

/** The caller's open or confirmed request to this organisation, from any of their projects (SC-20 #13). */
function myRequest(session, orgId) {
  const userId = userOf(session);
  if (!userId || session.role !== 'member') return null;
  const row = getOne(`SELECT r.request_id, r.status FROM collab_request r
    JOIN project_member pm ON pm.project_id = r.project_id AND pm.user_id = ? AND pm.invite_status = 'accepted'
    WHERE r.org_id = ? AND r.status IN ('pending', 'under_review', 'info_requested', 'accepted', 'confirmed')
    ORDER BY r.sent_at DESC LIMIT 1`, [userId, orgId]);
  return row ? { request_id: row.request_id, status: row.status } : null;
}

export function getProfile(session, slug, { today = todayInVietnam() } = {}) {
  const org = asOrg(getOne('SELECT * FROM organisation WHERE slug = ?', [slug]));
  if (!org) throw new PartnerError('NOT_FOUND');
  const member = signedIn(session) ? asMemberLayer(getOne('SELECT * FROM organisation_member_layer WHERE org_id = ?', [org.org_id])) : null;
  const priv = canReadPrivate(session, org.org_id) ? getOne('SELECT * FROM organisation_private_layer WHERE org_id = ?', [org.org_id]) : null;
  const approved = getOne("SELECT reference_projects, decided_at FROM verification_request WHERE org_id = ? AND status = 'approved' ORDER BY decided_at DESC LIMIT 1", [org.org_id]);
  return shapeProfile({ org, member, priv, approved, myRequest: myRequest(session, org.org_id) }, { today, signedIn: signedIn(session) });
}

/** The organisation a partner acts for (SC-21, SC-22). */
function ownOrg(session) {
  if (!userOf(session)) throw new PartnerError('UNAUTHENTICATED');
  if (session.role !== 'partner') throw new PartnerError('FORBIDDEN');
  const [orgId] = orgsOfUser(session);
  if (!orgId) throw new PartnerError('NOT_FOUND');
  return asOrg(getOne('SELECT * FROM organisation WHERE org_id = ?', [orgId]));
}

export function getMyOrganisation(session) {
  const org = ownOrg(session);
  const latest = getOne('SELECT status, reason, decided_at FROM verification_request WHERE org_id = ? ORDER BY submitted_at DESC LIMIT 1', [org.org_id]);
  const priv = getOne('SELECT * FROM organisation_private_layer WHERE org_id = ?', [org.org_id]);
  return {
    organisation: org,
    member: asMemberLayer(getOne('SELECT * FROM organisation_member_layer WHERE org_id = ?', [org.org_id])),
    private: priv ? { rate_card: priv.rate_card ? JSON.parse(priv.rate_card) : null, past_clients: priv.past_clients ? JSON.parse(priv.past_clients) : [], direct_contact: priv.direct_contact || null } : null,
    verification: { status: latest?.status ?? null, reason: latest?.reason || null, verified_until: org.verified_until }
  };
}

/** FR-001: the partner saves layers 1–3 of its own organisation, live at once (D3); VFDA's fields are refused by the input check. */
export function saveOrgProfile(session, value) {
  const org = ownOrg(session);
  if (!isOrgUser(session, org.org_id)) throw new PartnerError('FORBIDDEN');
  if (org.org_status === 'deactivated') throw new PartnerError('ORG_DEACTIVATED');
  const j = (v) => (v === null || v === undefined ? null : JSON.stringify(v));
  withTransaction((db) => {
    const l1 = ['org_name', 'legal_form', 'founded_year', 'hq_province', 'service_groups', 'provinces'].filter(k => k in value);
    if (l1.length) {
      db.prepare(`UPDATE organisation SET ${l1.map(k => `${k} = ?`).join(', ')} WHERE org_id = ?`)
        .run(...l1.map(k => (['service_groups', 'provinces'].includes(k) ? j(value[k]) : value[k])), org.org_id);
    }
    const l2 = ['capability_desc_vi', 'capability_desc_en', 'portfolio', 'working_languages'].filter(k => k in value);
    if (l2.length) {
      if (!db.prepare('SELECT 1 AS x FROM organisation_member_layer WHERE org_id = ?').get(org.org_id)) {
        db.prepare('INSERT INTO organisation_member_layer (org_id, intl_project_count) VALUES (?, 0)').run(org.org_id);
      }
      db.prepare(`UPDATE organisation_member_layer SET ${l2.map(k => `${k} = ?`).join(', ')} WHERE org_id = ?`)
        .run(...l2.map(k => (['portfolio', 'working_languages'].includes(k) ? j(value[k]) : value[k])), org.org_id);
    }
    const l3 = ['rate_card', 'past_clients', 'direct_contact'].filter(k => k in value);
    if (l3.length) {
      if (!db.prepare('SELECT 1 AS x FROM organisation_private_layer WHERE org_id = ?').get(org.org_id)) {
        db.prepare('INSERT INTO organisation_private_layer (org_id) VALUES (?)').run(org.org_id);
      }
      db.prepare(`UPDATE organisation_private_layer SET ${l3.map(k => `${k} = ?`).join(', ')} WHERE org_id = ?`)
        .run(...l3.map(k => (k === 'direct_contact' ? value[k] : j(value[k]))), org.org_id);
    }
  });
  return getMyOrganisation(session);
}

/** BR-008: deactivate, never delete; every open request is withdrawn with a system message and both parties notified. */
export async function deactivateOrg(session, { typed_name: typedName, org_id: orgIdInput = null } = {}) {
  const orgId = orgIdInput ?? (session?.role === 'partner' ? orgsOfUser(session)[0] : null);
  const org = orgId ? asOrg(getOne('SELECT * FROM organisation WHERE org_id = ?', [orgId])) : null;
  if (!org) throw new PartnerError(userOf(session) ? 'NOT_FOUND' : 'UNAUTHENTICATED');
  if (!isOrgUser(session, org.org_id) && !isStaff(session)) throw new PartnerError('FORBIDDEN');
  if (String(typedName || '').trim() !== org.org_name.trim()) throw new PartnerError('VALIDATION_ERROR');
  const open = query("SELECT * FROM collab_request WHERE org_id = ? AND status IN ('pending', 'under_review', 'info_requested', 'accepted')", [org.org_id]);
  const at = nowInVietnam();
  withTransaction((db) => {
    db.prepare("UPDATE organisation SET org_status = 'deactivated' WHERE org_id = ?").run(org.org_id);
    for (const r of open) {
      db.prepare('INSERT INTO collab_message (message_id, request_id, author_id, created_at, body) VALUES (?, ?, ?, ?, ?)')
        .run(randomUUID(), r.request_id, userOf(session), at, 'Tổ chức đã ngừng hoạt động trên CINEMATCH. — The organisation is no longer active on CINEMATCH.');
      db.prepare("UPDATE collab_request SET status = 'withdrawn' WHERE request_id = ?").run(r.request_id);
    }
    writeAudit(db, { action: 'organisation.deactivate', adminId: userOf(session), targetId: org.org_id });
  });
  for (const r of open) {
    const project = getOne('SELECT project_name FROM project WHERE project_id = ?', [r.project_id])?.project_name ?? null;
    await notifyParties(r, 'collab_request.withdrawn', { request_id: r.request_id, project, organisation: org.org_name, status: 'withdrawn' });
  }
  return { org_status: 'deactivated', withdrawn: open.length };
}
