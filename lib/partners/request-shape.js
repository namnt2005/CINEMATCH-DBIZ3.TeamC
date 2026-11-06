// The SC-25 view of one request and the list items (contracts/requests-api.contract.md), the same for both sources.
import { step, isFinal, can, OPEN_STATUSES } from './lifecycle.js';
import { isVerified, todayInVietnam } from './badge.js';
import { NDA_VERSION } from './nda.js';

const asList = (v) => (Array.isArray(v) ? v : v ? JSON.parse(v) : []);
const DAY = 86400000;

/** The latest moment something happened on the request (SC-25 #3 sort). */
export function updatedAt(r, lastMessageAt = null) {
  return [r.sent_at, r.responded_at, r.confirmed_at, lastMessageAt].filter(Boolean).sort().pop() || r.sent_at;
}

/** R14, BR-006: present only with the slot present; pending once a request of the project is confirmed; else missing. */
export function componentC(slotState, projectHasConfirmed) {
  if (slotState === 'present') return 'present';
  return projectHasConfirmed ? 'pending' : 'missing';
}

export function shapeRequest({ request: r, project, org, messages, nda, side, slotState, projectHasConfirmed, today = todayInVietnam() }) {
  const s = step(r.status, { producerNda: nda.producer });
  const quiet = r.responded_at ? 0 : Math.max(0, Math.floor((Date.parse(`${today}T00:00:00+07:00`) - Date.parse(r.sent_at)) / DAY));
  return {
    request_id: r.request_id, status: r.status, step: s, final: isFinal(r.status),
    project: { project_id: project.project_id, project_name: project.project_name, format: project.format ?? null, shoot_date: project.shoot_date ?? null,
      crew_size_band: project.crew_size_band ?? null },
    organisation: { slug: org.slug, org_name: org.org_name, verified: isVerified(org, today), art13_eligible: Boolean(org.art13_eligible) && isVerified(org, today) },
    services: asList(r.services), note: r.note ?? null, response_note: r.response_note ?? null,
    sent_at: r.sent_at, responded_at: r.responded_at || null, confirmed_at: r.confirmed_at || null,
    messages, nda: { version: NDA_VERSION, producer: nda.producer, partner: nda.partner },
    can: can(r.status, { side, producerNda: nda.producer }),
    component_c: componentC(slotState, projectHasConfirmed), quiet_days: quiet
  };
}

export function listItem({ request: r, project, org, nda, lastMessageAt }) {
  return { request_id: r.request_id, status: r.status, step: step(r.status, { producerNda: nda?.producer }), final: isFinal(r.status),
    project: { project_id: project.project_id, project_name: project.project_name },
    organisation: { slug: org.slug, org_name: org.org_name }, services: asList(r.services), sent_at: r.sent_at, updated_at: updatedAt(r, lastMessageAt) };
}

/** Most recently updated first; with `openFirst`, open requests before ended ones (the partner inbox, FR-013). */
export function sortItems(items, { openFirst = false } = {}) {
  return [...items].sort((a, b) => (openFirst ? Number(OPEN_STATUSES.includes(b.status)) - Number(OPEN_STATUSES.includes(a.status)) : 0)
    || String(b.updated_at).localeCompare(String(a.updated_at)));
}
