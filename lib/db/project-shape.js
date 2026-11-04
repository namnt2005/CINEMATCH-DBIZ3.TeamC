// Shared shapes and errors of the M0 data layer (specs/005-m0-workspace contracts/projects-api.contract.md).

export const STAGES = Object.freeze(['draft', 'preparing', 'archived']);
export const EDITORS = Object.freeze(['owner', 'edit']);
export const INVITE_TEMPLATE = 'project.invite';
// Codes the write functions raise; the API maps them to HTTP statuses
export const PROJECT_ERRORS = Object.freeze(['NOT_FOUND', 'FORBIDDEN', 'ARCHIVED', 'NAME_TAKEN', 'NO_ORGANISATION',
  'ALREADY_INVITED', 'INVALID_PERMISSION', 'INVALID_STAGE', 'UNAUTHENTICATED']);

export class ProjectError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ProjectError';
    this.code = code;
  }
}

/** The code of a PostgreSQL function error (RAISE EXCEPTION 'NAME_TAKEN'), or null. */
export function projectErrorCode(error) {
  const text = String(error?.message || '');
  return PROJECT_ERRORS.find(code => text === code || text.startsWith(`${code}:`) || text.includes(code)) ?? null;
}

const number = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const SCORES = ['content_score', 'locations_score', 'partners_score', 'dossier_score', 'logistics_score', 'readiness_total'];

/** One row of v_project_readiness with numbers as numbers (PostgreSQL numeric may arrive as text). Nothing is computed. */
export function asReadiness(row) {
  if (!row) return null;
  const out = { ...row };
  for (const col of SCORES) out[col] = number(row[col]);
  out.gauges_counted = number(row.gauges_counted);
  out.content_open_findings = number(row.content_open_findings) ?? 0;
  return out;
}

export function stageCounts(stages) {
  const counts = Object.fromEntries(STAGES.map(s => [s, 0]));
  for (const s of stages) if (s in counts) counts[s] += 1;
  return counts;
}

/** A card of the project list (SC-10): project fields, the caller's permission and the view's numbers. */
export function asCard(project, permission, readiness) {
  return {
    project_id: project.project_id, project_name: project.project_name, format: project.format, segment: project.segment,
    stage: project.stage, shoot_date: project.shoot_date ?? null, updated_at: project.updated_at ?? null, permission,
    readiness_total: readiness?.readiness_total ?? null, next_action_primary: readiness?.next_action_primary ?? null,
    // what the card's next-step sentence names (count of open findings, missing components)
    content_open_findings: readiness?.content_open_findings ?? 0, dossier_missing: readiness?.dossier_missing ?? null
  };
}
