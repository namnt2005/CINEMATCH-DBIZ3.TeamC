// The SC-36 queue shape (FR-009), shared by both sources; pure (no database access).
const DAY = 86400000;

/** Pending first (oldest first), then newest decision first; counts; age of the oldest pending request (SC-36 #3–#5). */
export function shapeQueue(rows, status, today, partnerNames) {
  const asList = (v) => (Array.isArray(v) ? v : v ? JSON.parse(v) : []);
  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const r of rows) if (counts[r.status] !== undefined) counts[r.status] += 1;
  const pending = rows.filter(r => r.status === 'pending').sort((a, b) => String(a.submitted_at).localeCompare(String(b.submitted_at)));
  const decided = rows.filter(r => r.status !== 'pending').sort((a, b) => String(b.decided_at).localeCompare(String(a.decided_at)));
  const oldest = pending[0] ? Math.floor((Date.parse(`${today}T23:59:59+07:00`) - Date.parse(pending[0].submitted_at)) / DAY) : null;
  const shown = [...pending, ...decided].filter(r => status === 'all' || r.status === status);
  return {
    counts, oldest_pending_days: oldest,
    requests: shown.map(r => ({ request_id: r.request_id, status: r.status, submitted_at: r.submitted_at, decided_at: r.decided_at, reason: r.reason,
      reference_projects: asList(r.reference_projects), has_file: Boolean(r.business_license), partner_names: partnerNames(r.org_id),
      org: { org_id: r.org_id, org_name: r.org_name, hq_province: r.hq_province == null || r.hq_province === '' ? null : Number(r.hq_province), legal_form: r.legal_form,
        founded_year: r.founded_year == null || r.founded_year === '' ? null : Number(r.founded_year), provinces: asList(r.provinces).map(Number),
        service_groups: asList(r.service_groups), art13_eligible: r.art13_eligible === true || r.art13_eligible === 'true' || r.art13_eligible === 1 } }))
  };
}

