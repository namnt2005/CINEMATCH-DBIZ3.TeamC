-- v_dossier_check: the Article 13 clause 3 dossier check of M2 (BR-005, FR-008, research R8) — one row per project of a
-- segment with the Dossier gauge and per A13 document type, in the order a–d. Fixed rules only, no language model.
-- Portable SQL for SQLite 3.44+ and PostgreSQL; lib/dossier/render-view.js drops these comments and the migration
-- embeds the result. The M0 readiness view reads it, so SC-12 and SC-27 cannot differ (FR-010, SC-005).
-- State: the stored document_slot.state (missing when there is no slot), lowered for b while a paragraph of the
-- Vietnamese version is not reviewed (SC-27 SR-086) and for c while the project has no confirmed request (SR-085).
SELECT
  p.project_id,
  dt.doc_code,
  CASE dt.doc_code WHEN 'A13_APPLICATION' THEN 1 WHEN 'A13_SCRIPT_VI' THEN 2 WHEN 'A13_SERVICE_AGREEMENT' THEN 3 ELSE 4 END AS ord,
  COALESCE(ds.state, 'missing') AS stored_state,
  CASE
    WHEN COALESCE(ds.state, 'missing') = 'present' AND dt.doc_code = 'A13_SCRIPT_VI'
         AND EXISTS (SELECT 1 FROM bilingual_paragraph bp
                     WHERE bp.project_id = p.project_id AND bp.doc_code = dt.doc_code AND COALESCE(bp.status, '') <> 'reviewed')
      THEN 'needs_fix'
    WHEN COALESCE(ds.state, 'missing') = 'present' AND dt.doc_code = 'A13_SERVICE_AGREEMENT'
         AND NOT EXISTS (SELECT 1 FROM collab_request cr WHERE cr.project_id = p.project_id AND cr.status = 'confirmed')
      THEN 'pending'
    ELSE COALESCE(ds.state, 'missing')
  END AS state
FROM project p
JOIN document_type dt ON SUBSTR(dt.doc_code, 1, 4) = 'A13_'
LEFT JOIN document_slot ds ON ds.project_id = p.project_id AND ds.doc_code = dt.doc_code
WHERE EXISTS (SELECT 1 FROM segment_requirement g WHERE g.segment = p.segment AND g.requirement_code = 'GAUGE_DOSSIER')
