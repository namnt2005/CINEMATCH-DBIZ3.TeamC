-- v_project_readiness: the only place where M0 computes gauge scores, the overall readiness and the next
-- steps (BR-001). Portable SQL for SQLite 3.44+ and PostgreSQL; lib/readiness/render-view.js fills the one
-- placeholder (the ordered list aggregate) and the migration embeds the PostgreSQL rendering.
-- Formulas: specs/005-m0-workspace/research.md R1 (= data/seed/seed_rules.py readiness()); gauges shown and
-- counted from the GAUGE_* rows of segment_requirement (R2, BR-002, BR-004); next steps R4 (BR-003).
-- M0 §3 edge case (decision H1): a counted gauge whose readiness_source row is not reporting has no score,
-- the step not_reported, and stays out of the overall score, which uses only the gauges that reported.
SELECT
  s.project_id,
  s.segment,
  s.content_score,
  s.locations_score,
  s.partners_score,
  s.dossier_score,
  CAST(NULL AS NUMERIC) AS logistics_score,
  SUBSTR(
    (CASE WHEN s.show_content = 1 THEN ',content' ELSE '' END)
    || (CASE WHEN s.show_locations = 1 THEN ',locations' ELSE '' END)
    || (CASE WHEN s.show_partners = 1 THEN ',partners' ELSE '' END)
    || (CASE WHEN s.show_dossier = 1 THEN ',dossier' ELSE '' END)
    || (CASE WHEN s.show_logistics = 1 THEN ',logistics' ELSE '' END), 2) AS gauges_shown,
  s.count_content + s.count_locations + s.count_partners + s.count_dossier AS gauges_counted,
  CASE WHEN s.used_content + s.used_locations + s.used_partners + s.used_dossier = 0 THEN NULL
       ELSE ROUND((COALESCE(s.content_score, 0) * s.used_content + COALESCE(s.locations_score, 0) * s.used_locations
                   + COALESCE(s.partners_score, 0) * s.used_partners + COALESCE(s.dossier_score, 0) * s.used_dossier)
                  / (s.used_content + s.used_locations + s.used_partners + s.used_dossier), 2) END AS readiness_total,
  s.content_action,
  s.locations_action,
  s.partners_action,
  s.dossier_action,
  s.logistics_action,
  s.content_open_findings,
  s.dossier_missing,
  CASE WHEN s.content_action NOT IN ('done', 'not_reported') THEN s.content_action
       WHEN s.locations_action NOT IN ('done', 'not_reported') THEN s.locations_action
       WHEN s.partners_action NOT IN ('done', 'not_reported') THEN s.partners_action
       WHEN s.dossier_action NOT IN ('done', 'not_reported') THEN s.dossier_action
       WHEN s.count_content + s.count_locations + s.count_partners + s.count_dossier
            > s.used_content + s.used_locations + s.used_partners + s.used_dossier THEN 'not_reported'
       ELSE 'done' END AS next_action_primary,
  s.used_content + s.used_locations + s.used_partners + s.used_dossier AS gauges_reported,
  NULLIF(SUBSTR(
    (CASE WHEN s.count_content = 1 AND s.rep_content = 0 THEN ',content' ELSE '' END)
    || (CASE WHEN s.count_locations = 1 AND s.rep_locations = 0 THEN ',locations' ELSE '' END)
    || (CASE WHEN s.count_partners = 1 AND s.rep_partners = 0 THEN ',partners' ELSE '' END)
    || (CASE WHEN s.count_dossier = 1 AND s.rep_dossier = 0 THEN ',dossier' ELSE '' END), 2), '') AS gauges_not_reported
FROM (
  SELECT
    f.*,
    f.count_content * f.rep_content AS used_content,
    f.count_locations * f.rep_locations AS used_locations,
    f.count_partners * f.rep_partners AS used_partners,
    f.count_dossier * f.rep_dossier AS used_dossier,
    CASE WHEN f.rep_content = 0 THEN NULL WHEN f.run_id IS NULL THEN 0.0
         ELSE 30.0 + (CASE WHEN f.run_current = 1 THEN 30.0 ELSE 0.0 END)
              + (CASE WHEN f.findings_total = 0 THEN 40.0 ELSE 40.0 * f.findings_reviewed / f.findings_total END) END AS content_score,
    CASE WHEN f.rep_locations = 0 THEN NULL WHEN f.shortlist_n = 0 THEN 0.0 ELSE 50.0 + 25.0 * f.has_primary + 25.0 * f.has_backup END AS locations_score,
    CASE WHEN f.rep_partners = 0 THEN NULL WHEN f.requests_confirmed > 0 THEN 100.0 WHEN f.requests_accepted > 0 THEN 70.0
         WHEN f.requests_total > 0 THEN 30.0 ELSE 0.0 END AS partners_score,
    CASE WHEN f.show_dossier = 1 AND f.rep_dossier = 1 THEN 100.0 * f.a13_present / f.a13_types END AS dossier_score,
    CASE WHEN f.show_content = 0 THEN NULL
         WHEN f.rep_content = 0 THEN 'not_reported'
         WHEN f.run_id IS NULL THEN 'content.start_precheck'
         WHEN f.run_current = 0 THEN 'content.recheck_new_rules'
         WHEN f.findings_reviewed < f.findings_total THEN 'content.review_findings'
         ELSE 'done' END AS content_action,
    CASE WHEN f.show_locations = 0 THEN NULL
         WHEN f.rep_locations = 0 THEN 'not_reported'
         WHEN f.shortlist_n = 0 THEN 'locations.shortlist'
         WHEN f.has_primary = 0 THEN 'locations.choose_primary'
         WHEN f.has_backup = 0 THEN 'locations.choose_backup'
         ELSE 'done' END AS locations_action,
    CASE WHEN f.show_partners = 0 THEN NULL
         WHEN f.rep_partners = 0 THEN 'not_reported'
         WHEN f.requests_confirmed > 0 THEN 'done'
         WHEN f.requests_total = 0 THEN 'partners.send_request'
         WHEN f.requests_info > 0 THEN 'partners.answer_partner'
         WHEN f.requests_accepted > 0 THEN 'partners.confirm'
         WHEN f.requests_waiting > 0 THEN 'partners.await_reply'
         ELSE 'partners.send_request' END AS partners_action,
    CASE WHEN f.show_dossier = 0 THEN NULL
         WHEN f.rep_dossier = 0 THEN 'not_reported'
         WHEN f.a13_present < f.a13_types THEN 'dossier.add_missing'
         ELSE 'done' END AS dossier_action,
    CASE WHEN f.show_logistics = 0 THEN NULL ELSE 'logistics.phase2' END AS logistics_action,
    f.findings_total - f.findings_reviewed AS content_open_findings,
    CASE WHEN f.show_dossier = 1 AND f.rep_dossier = 1 THEN (
      SELECT {{ordered_list:dt.doc_code}}
      FROM document_type dt
      WHERE SUBSTR(dt.doc_code, 1, 4) = 'A13_'
        AND NOT EXISTS (SELECT 1 FROM document_slot ds
                        WHERE ds.project_id = f.project_id AND ds.doc_code = dt.doc_code AND ds.state = 'present')
    ) END AS dossier_missing
  FROM (
    SELECT
      p.project_id,
      p.segment,
      r.run_id,
      CASE WHEN r.rule_version = (SELECT MAX(v.rule_version) FROM rule_set_version v) THEN 1 ELSE 0 END AS run_current,
      (SELECT COUNT(*) FROM compliance_finding cf WHERE cf.run_id = r.run_id) AS findings_total,
      (SELECT COUNT(*) FROM compliance_finding cf WHERE cf.run_id = r.run_id AND cf.finding_status = 'reviewed') AS findings_reviewed,
      (SELECT COUNT(*) FROM project_shortlist sl WHERE sl.project_id = p.project_id) AS shortlist_n,
      CASE WHEN EXISTS (SELECT 1 FROM project_shortlist sl WHERE sl.project_id = p.project_id AND sl.role = 'primary') THEN 1 ELSE 0 END AS has_primary,
      CASE WHEN EXISTS (SELECT 1 FROM project_shortlist sl WHERE sl.project_id = p.project_id AND sl.role = 'backup') THEN 1 ELSE 0 END AS has_backup,
      (SELECT COUNT(*) FROM collab_request cr WHERE cr.project_id = p.project_id) AS requests_total,
      (SELECT COUNT(*) FROM collab_request cr WHERE cr.project_id = p.project_id AND cr.status = 'confirmed') AS requests_confirmed,
      (SELECT COUNT(*) FROM collab_request cr WHERE cr.project_id = p.project_id AND cr.status = 'accepted') AS requests_accepted,
      (SELECT COUNT(*) FROM collab_request cr WHERE cr.project_id = p.project_id AND cr.status = 'info_requested') AS requests_info,
      (SELECT COUNT(*) FROM collab_request cr WHERE cr.project_id = p.project_id AND cr.status IN ('pending', 'under_review')) AS requests_waiting,
      (SELECT COUNT(*) FROM document_type dt WHERE SUBSTR(dt.doc_code, 1, 4) = 'A13_') AS a13_types,
      (SELECT COUNT(*) FROM document_slot ds WHERE ds.project_id = p.project_id AND SUBSTR(ds.doc_code, 1, 4) = 'A13_' AND ds.state = 'present') AS a13_present,
      CASE WHEN EXISTS (SELECT 1 FROM segment_requirement g WHERE g.segment = p.segment AND g.requirement_code = 'GAUGE_CONTENT') THEN 1 ELSE 0 END AS show_content,
      CASE WHEN EXISTS (SELECT 1 FROM segment_requirement g WHERE g.segment = p.segment AND g.requirement_code = 'GAUGE_LOCATIONS') THEN 1 ELSE 0 END AS show_locations,
      CASE WHEN EXISTS (SELECT 1 FROM segment_requirement g WHERE g.segment = p.segment AND g.requirement_code = 'GAUGE_PARTNERS') THEN 1 ELSE 0 END AS show_partners,
      CASE WHEN EXISTS (SELECT 1 FROM segment_requirement g WHERE g.segment = p.segment AND g.requirement_code = 'GAUGE_DOSSIER') THEN 1 ELSE 0 END AS show_dossier,
      CASE WHEN EXISTS (SELECT 1 FROM segment_requirement g WHERE g.segment = p.segment AND g.requirement_code = 'GAUGE_LOGISTICS') THEN 1 ELSE 0 END AS show_logistics,
      CASE WHEN EXISTS (SELECT 1 FROM readiness_source rs WHERE rs.gauge = 'content' AND CAST(rs.reporting AS TEXT) IN ('true', '1')) THEN 1 ELSE 0 END AS rep_content,
      CASE WHEN EXISTS (SELECT 1 FROM readiness_source rs WHERE rs.gauge = 'locations' AND CAST(rs.reporting AS TEXT) IN ('true', '1')) THEN 1 ELSE 0 END AS rep_locations,
      CASE WHEN EXISTS (SELECT 1 FROM readiness_source rs WHERE rs.gauge = 'partners' AND CAST(rs.reporting AS TEXT) IN ('true', '1')) THEN 1 ELSE 0 END AS rep_partners,
      CASE WHEN EXISTS (SELECT 1 FROM readiness_source rs WHERE rs.gauge = 'dossier' AND CAST(rs.reporting AS TEXT) IN ('true', '1')) THEN 1 ELSE 0 END AS rep_dossier,
      CASE WHEN EXISTS (SELECT 1 FROM segment_requirement g WHERE g.segment = p.segment AND g.requirement_code = 'GAUGE_CONTENT' AND CAST(g.needed AS TEXT) IN ('true', '1')) THEN 1 ELSE 0 END AS count_content,
      CASE WHEN EXISTS (SELECT 1 FROM segment_requirement g WHERE g.segment = p.segment AND g.requirement_code = 'GAUGE_LOCATIONS' AND CAST(g.needed AS TEXT) IN ('true', '1')) THEN 1 ELSE 0 END AS count_locations,
      CASE WHEN EXISTS (SELECT 1 FROM segment_requirement g WHERE g.segment = p.segment AND g.requirement_code = 'GAUGE_PARTNERS' AND CAST(g.needed AS TEXT) IN ('true', '1')) THEN 1 ELSE 0 END AS count_partners,
      CASE WHEN EXISTS (SELECT 1 FROM segment_requirement g WHERE g.segment = p.segment AND g.requirement_code = 'GAUGE_DOSSIER' AND CAST(g.needed AS TEXT) IN ('true', '1')) THEN 1 ELSE 0 END AS count_dossier
    FROM project p
    LEFT JOIN compliance_run r ON r.run_id = (
      SELECT cr.run_id FROM compliance_run cr WHERE cr.project_id = p.project_id ORDER BY cr.run_at DESC, cr.run_id DESC LIMIT 1)
  ) f
) s
