-- M2 content pre-check and Article 13 dossier check (specs/008-m2-check data-model §2–§7, research R1–R14).
-- New databases already get the columns, keys and read policies from 20261101000100_schema.sql and
-- 20261101000300_grants_rls.sql (regenerated from data/schema and tools/rls_policies.py); this file brings databases
-- pushed before 08/11/2026 to the same shape (every statement is safe on both shapes), closes every direct write,
-- and adds the write functions. Notifications are written by the API (System actor), as in M4 and M7.

-- ---- D2, D4, D15, D17: one row per rule revision; keywords; segments; samples --------------------------------
ALTER TABLE public.legal_rule
    ADD COLUMN IF NOT EXISTS revision INTEGER,
    ADD COLUMN IF NOT EXISTS retired_version VARCHAR(20),
    ADD COLUMN IF NOT EXISTS keywords_vi JSONB,
    ADD COLUMN IF NOT EXISTS keywords_en JSONB,
    ADD COLUMN IF NOT EXISTS segments JSONB,
    ADD COLUMN IF NOT EXISTS is_sample BOOLEAN;
UPDATE public.legal_rule SET revision = 1 WHERE revision IS NULL;
UPDATE public.legal_rule SET segments = '["A","B","C"]'::jsonb WHERE segments IS NULL;
-- rows already in the database are the seed's sample rules (D15); the reseed rewrites them
UPDATE public.legal_rule SET is_sample = true WHERE is_sample IS NULL;
-- placeholder for rules retired before Q13 recorded the retiring version; the reseed rewrites them
UPDATE public.legal_rule SET retired_version = rule_version WHERE status = 'retired' AND retired_version IS NULL;
ALTER TABLE public.legal_rule
    ALTER COLUMN revision SET NOT NULL,
    ALTER COLUMN segments SET NOT NULL,
    ALTER COLUMN is_sample SET NOT NULL;

-- the foreign keys on rule_code depend on its unique key: drop them first
ALTER TABLE public.precheck_finding DROP CONSTRAINT IF EXISTS fk_precheck_finding_rule_code;
ALTER TABLE public.compliance_finding DROP CONSTRAINT IF EXISTS fk_compliance_finding_rule_code;
ALTER TABLE public.legal_rule DROP CONSTRAINT IF EXISTS uq_legal_rule_rule_code;
ALTER TABLE public.legal_rule DROP CONSTRAINT IF EXISTS uq_legal_rule_rule_slug;
ALTER TABLE public.legal_rule DROP CONSTRAINT IF EXISTS uq_legal_rule_rule_code_revision;
ALTER TABLE public.legal_rule ADD CONSTRAINT uq_legal_rule_rule_code_revision UNIQUE (rule_code, revision);
ALTER TABLE public.legal_rule DROP CONSTRAINT IF EXISTS uq_legal_rule_rule_slug_revision;
ALTER TABLE public.legal_rule ADD CONSTRAINT uq_legal_rule_rule_slug_revision UNIQUE (rule_slug, revision);
ALTER TABLE public.legal_rule DROP CONSTRAINT IF EXISTS ck_legal_rule_revision;
ALTER TABLE public.legal_rule ADD CONSTRAINT ck_legal_rule_revision CHECK (revision >= 1);
ALTER TABLE public.legal_rule DROP CONSTRAINT IF EXISTS ck_legal_rule_retired_version;
ALTER TABLE public.legal_rule ADD CONSTRAINT ck_legal_rule_retired_version CHECK ((status = 'retired') = (retired_version IS NOT NULL));
ALTER TABLE public.legal_rule DROP CONSTRAINT IF EXISTS fk_legal_rule_retired_version;
ALTER TABLE public.legal_rule ADD CONSTRAINT fk_legal_rule_retired_version FOREIGN KEY (retired_version) REFERENCES public.rule_set_version (rule_version);
-- Q13: at most one approved revision per code (a partial unique index; node:sqlite twin in lib/db/local-triggers.sql)
CREATE UNIQUE INDEX IF NOT EXISTS uq_legal_rule_one_approved ON public.legal_rule (rule_code) WHERE status = 'approved';

-- ---- Findings cite the revision (D2); a pre-check stores no text of the summary (Q6, D3) -----------------------
ALTER TABLE public.precheck_finding ADD COLUMN IF NOT EXISTS rule_id UUID;
ALTER TABLE public.compliance_finding ADD COLUMN IF NOT EXISTS rule_id UUID;
DO $backfill$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'precheck_finding' AND column_name = 'rule_code') THEN
    EXECUTE 'UPDATE public.precheck_finding f SET rule_id = r.rule_id FROM public.legal_rule r
             WHERE f.rule_id IS NULL AND r.rule_code = f.rule_code AND r.revision = 1';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'compliance_finding' AND column_name = 'rule_code') THEN
    EXECUTE 'UPDATE public.compliance_finding f SET rule_id = r.rule_id FROM public.legal_rule r
             WHERE f.rule_id IS NULL AND r.rule_code = f.rule_code AND r.revision = 1';
  END IF;
END
$backfill$;
ALTER TABLE public.precheck_finding ALTER COLUMN rule_id SET NOT NULL;
ALTER TABLE public.compliance_finding ALTER COLUMN rule_id SET NOT NULL;
ALTER TABLE public.precheck_finding DROP CONSTRAINT IF EXISTS pk_precheck_finding;
ALTER TABLE public.precheck_finding ADD CONSTRAINT pk_precheck_finding PRIMARY KEY (brief_id, rule_id, span_start);
ALTER TABLE public.precheck_finding DROP CONSTRAINT IF EXISTS fk_precheck_finding_rule_id;
ALTER TABLE public.precheck_finding ADD CONSTRAINT fk_precheck_finding_rule_id FOREIGN KEY (rule_id) REFERENCES public.legal_rule (rule_id);
ALTER TABLE public.compliance_finding DROP CONSTRAINT IF EXISTS fk_compliance_finding_rule_id;
ALTER TABLE public.compliance_finding ADD CONSTRAINT fk_compliance_finding_rule_id FOREIGN KEY (rule_id) REFERENCES public.legal_rule (rule_id);
ALTER TABLE public.precheck_finding DROP CONSTRAINT IF EXISTS ck_precheck_finding_span_matches_quote;
ALTER TABLE public.precheck_finding
    DROP COLUMN IF EXISTS rule_code,
    DROP COLUMN IF EXISTS quoted_text,
    DROP COLUMN IF EXISTS explanation_vi,
    DROP COLUMN IF EXISTS explanation_en;
ALTER TABLE public.precheck_finding DROP CONSTRAINT IF EXISTS ck_precheck_finding_span;
ALTER TABLE public.precheck_finding ADD CONSTRAINT ck_precheck_finding_span CHECK (span_start >= 0 AND span_end > span_start);
ALTER TABLE public.compliance_finding DROP COLUMN IF EXISTS rule_code;

-- ---- D11: dropped findings counted on the run, codes only -----------------------------------------------------
ALTER TABLE public.precheck_run
    ADD COLUMN IF NOT EXISTS dropped_count INTEGER,
    ADD COLUMN IF NOT EXISTS dropped_rule_codes JSONB;
UPDATE public.precheck_run SET dropped_count = 0 WHERE dropped_count IS NULL AND attention_level IS NOT NULL;
UPDATE public.precheck_run SET dropped_rule_codes = '[]'::jsonb WHERE dropped_rule_codes IS NULL;
ALTER TABLE public.precheck_run ALTER COLUMN dropped_rule_codes SET NOT NULL;
ALTER TABLE public.precheck_run DROP CONSTRAINT IF EXISTS ck_precheck_run_dropped_count;
ALTER TABLE public.precheck_run ADD CONSTRAINT ck_precheck_run_dropped_count CHECK (dropped_count >= 0);

-- ---- Read policies (data-model §7; source tools/rls_policies.py, same text as 20261101000300_grants_rls.sql) ----
GRANT SELECT ON public.rule_set_version TO authenticated;
DROP POLICY IF EXISTS rls_rule_set_version_select_signed_in ON public.rule_set_version;
CREATE POLICY rls_rule_set_version_select_signed_in ON public.rule_set_version FOR SELECT TO authenticated
  USING (app.current_role() <> 'guest');
GRANT SELECT ON public.precheck_run TO authenticated;
DROP POLICY IF EXISTS rls_precheck_run_select_member ON public.precheck_run;
CREATE POLICY rls_precheck_run_select_member ON public.precheck_run FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND app.is_project_member(project_id));
GRANT SELECT ON public.compliance_run TO authenticated;
DROP POLICY IF EXISTS rls_compliance_run_select_member ON public.compliance_run;
CREATE POLICY rls_compliance_run_select_member ON public.compliance_run FOR SELECT TO authenticated
  USING (app.is_project_member(project_id));

-- ---- R6: every write goes through the functions below (narrower than the generated policy matrix) -------------
REVOKE INSERT, UPDATE, DELETE ON public.rule_set_version FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.legal_rule FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.precheck_run FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.precheck_finding FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.compliance_run FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.compliance_finding FROM anon, authenticated;

-- ---- D6: the next rule-set version label, YYYY.MM then YYYY.MM.02 … in Vietnam time (JS twin lib/legal/version.js)
CREATE OR REPLACE FUNCTION app.next_rule_version()
RETURNS VARCHAR
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_base TEXT := to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY.MM');
  v_n INTEGER;
BEGIN
  SELECT count(*) INTO v_n FROM public.rule_set_version v WHERE v.rule_version = v_base OR v.rule_version LIKE v_base || '.%';
  IF v_n = 0 THEN RETURN v_base; END IF;
  RETURN v_base || '.' || lpad((v_n + 1)::TEXT, 2, '0');
END;
$$;
REVOKE ALL ON FUNCTION app.next_rule_version() FROM PUBLIC, anon, authenticated;

-- ---- FR-007, BR-001, BR-004, D11: the System actor records a pre-check (hash, revisions, spans — never text) -------
CREATE OR REPLACE FUNCTION public.app_record_precheck(p_hash TEXT, p_lang TEXT, p_flags JSONB, p_country TEXT, p_rule_version TEXT,
  p_project_id UUID, p_findings JSONB, p_dropped_count INTEGER, p_dropped_rule_codes JSONB)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_id UUID := gen_random_uuid();
  v_findings JSONB := COALESCE(p_findings, '[]'::jsonb);
  v_bad INTEGER;
  v_action INTEGER;
  v_notice INTEGER;
  v_level TEXT;
BEGIN
  IF p_lang NOT IN ('en', 'vi') OR p_rule_version IS NULL OR COALESCE(p_dropped_count, 0) < 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  -- BR-001, BR-007: every cited revision was signed in or before this version and not yet retired then
  SELECT count(*) INTO v_bad FROM jsonb_array_elements(v_findings) f
   WHERE NOT EXISTS (SELECT 1 FROM public.legal_rule r WHERE r.rule_id = (f ->> 'rule_id')::uuid
          AND r.rule_version IS NOT NULL AND r.rule_version <= p_rule_version
          AND (r.retired_version IS NULL OR r.retired_version > p_rule_version)
          AND r.citation IS NOT NULL AND r.approved_by IS NOT NULL);
  IF v_bad > 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  -- BR-004 (Q4): the level is recomputed here from the cited rules, never taken from the caller
  SELECT count(*) FILTER (WHERE r.severity = 'action'), count(*) FILTER (WHERE r.severity = 'notice') INTO v_action, v_notice
    FROM jsonb_array_elements(v_findings) f JOIN public.legal_rule r ON r.rule_id = (f ->> 'rule_id')::uuid;
  IF jsonb_array_length(v_findings) = 0 AND COALESCE(p_dropped_count, 0) > 0 THEN v_level := NULL;
  ELSIF v_action >= 2 THEN v_level := 'high';
  ELSIF v_action = 1 OR v_notice >= 3 THEN v_level := 'medium';
  ELSE v_level := 'low';
  END IF;
  INSERT INTO public.precheck_run (brief_id, project_id, rule_version, synopsis_hash, lang, flags, country_guess, attention_level,
    dropped_count, dropped_rule_codes, created_at)
  VALUES (v_id, p_project_id, p_rule_version, p_hash, p_lang, p_flags, p_country, v_level,
    COALESCE(p_dropped_count, 0), COALESCE(p_dropped_rule_codes, '[]'::jsonb), now());
  INSERT INTO public.precheck_finding (brief_id, rule_id, span_start, span_end)
    SELECT v_id, (f ->> 'rule_id')::uuid, (f ->> 'span_start')::integer, (f ->> 'span_end')::integer FROM jsonb_array_elements(v_findings) f;
  RETURN v_id;
END;
$$;

-- ---- D5, R7: Save to project — checked again against the text, which is not stored -----------------------------
CREATE OR REPLACE FUNCTION public.app_save_content_check(p_project_id UUID, p_rule_version TEXT, p_lang TEXT, p_text TEXT, p_findings JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_stage TEXT;
  v_perm TEXT;
  v_current TEXT;
  v_findings JSONB := COALESCE(p_findings, '[]'::jsonb);
  v_bad INTEGER;
  v_run UUID := gen_random_uuid();
  v_brief UUID := gen_random_uuid();
  v_at TIMESTAMPTZ := now();
  v_action INTEGER;
  v_notice INTEGER;
  v_level TEXT;
BEGIN
  IF auth.uid() IS NULL OR app.current_role() = 'guest' THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  SELECT p.stage INTO v_stage FROM public.project p WHERE p.project_id = p_project_id;
  SELECT pm.permission INTO v_perm FROM public.project_member pm
   WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid() AND pm.invite_status = 'accepted';
  IF v_stage IS NULL OR v_perm IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_perm NOT IN ('owner', 'edit') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_stage = 'archived' THEN RAISE EXCEPTION 'ARCHIVED'; END IF;
  SELECT max(v.rule_version) INTO v_current FROM public.rule_set_version v;
  IF p_rule_version IS DISTINCT FROM v_current THEN RAISE EXCEPTION 'RULE_SET_CHANGED'; END IF;
  IF p_text IS NULL OR p_lang NOT IN ('en', 'vi') OR jsonb_array_length(v_findings) = 0 OR jsonb_array_length(v_findings) > 50 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  -- BR-001: an approved, active, cited and signed revision, and a quote found verbatim in the text
  SELECT count(*) INTO v_bad FROM jsonb_array_elements(v_findings) f
   WHERE NOT EXISTS (SELECT 1 FROM public.legal_rule r WHERE r.rule_id = (f ->> 'rule_id')::uuid
          AND r.status = 'approved' AND r.is_active AND r.citation IS NOT NULL AND r.approved_by IS NOT NULL)
      OR COALESCE(btrim(f ->> 'quoted_text'), '') = '' OR length(f ->> 'quoted_text') > 500
      OR strpos(p_text, f ->> 'quoted_text') = 0;
  IF v_bad > 0 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  INSERT INTO public.compliance_run (run_id, project_id, rule_version, run_at) VALUES (v_run, p_project_id, p_rule_version, v_at);
  INSERT INTO public.compliance_finding (finding_id, run_id, rule_id, quoted_text, finding_status, reviewer_note)
    SELECT gen_random_uuid(), v_run, (f ->> 'rule_id')::uuid, btrim(f ->> 'quoted_text'), 'open', NULL FROM jsonb_array_elements(v_findings) f;
  -- FR-007: the save is also a demand data point — the hash of the text and the spans, never the text
  SELECT count(*) FILTER (WHERE r.severity = 'action'), count(*) FILTER (WHERE r.severity = 'notice') INTO v_action, v_notice
    FROM jsonb_array_elements(v_findings) f JOIN public.legal_rule r ON r.rule_id = (f ->> 'rule_id')::uuid;
  v_level := CASE WHEN v_action >= 2 THEN 'high' WHEN v_action = 1 OR v_notice >= 3 THEN 'medium' ELSE 'low' END;
  INSERT INTO public.precheck_run (brief_id, project_id, rule_version, synopsis_hash, lang, flags, country_guess, attention_level,
    dropped_count, dropped_rule_codes, created_at)
  VALUES (v_brief, p_project_id, p_rule_version, encode(sha256(convert_to(regexp_replace(btrim(p_text), '\s+', ' ', 'g'), 'UTF8')), 'hex'),
    p_lang, NULL, NULL, v_level, 0, '[]'::jsonb, v_at);
  INSERT INTO public.precheck_finding (brief_id, rule_id, span_start, span_end)
    SELECT DISTINCT ON ((f ->> 'rule_id')::uuid, strpos(p_text, btrim(f ->> 'quoted_text')) - 1)
           v_brief, (f ->> 'rule_id')::uuid, strpos(p_text, btrim(f ->> 'quoted_text')) - 1,
           strpos(p_text, btrim(f ->> 'quoted_text')) - 1 + length(btrim(f ->> 'quoted_text'))
      FROM jsonb_array_elements(v_findings) f;
  RETURN jsonb_build_object('run_id', v_run, 'rule_version', p_rule_version, 'findings', jsonb_array_length(v_findings));
END;
$$;

-- ---- FR-014: owner or edit marks a finding reviewed, with an optional note ---------------------------------------
CREATE OR REPLACE FUNCTION public.app_review_finding(p_finding_id UUID, p_note TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_project UUID;
  v_stage TEXT;
  v_perm TEXT;
  v_note TEXT := NULLIF(btrim(COALESCE(p_note, '')), '');
BEGIN
  IF auth.uid() IS NULL OR app.current_role() = 'guest' THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF length(COALESCE(p_note, '')) > 1000 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  SELECT r.project_id INTO v_project FROM public.compliance_finding f JOIN public.compliance_run r ON r.run_id = f.run_id WHERE f.finding_id = p_finding_id;
  IF v_project IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT p.stage INTO v_stage FROM public.project p WHERE p.project_id = v_project;
  SELECT pm.permission INTO v_perm FROM public.project_member pm
   WHERE pm.project_id = v_project AND pm.user_id = auth.uid() AND pm.invite_status = 'accepted';
  IF v_perm IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_perm NOT IN ('owner', 'edit') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_stage = 'archived' THEN RAISE EXCEPTION 'ARCHIVED'; END IF;
  UPDATE public.compliance_finding SET finding_status = 'reviewed', reviewer_note = v_note WHERE finding_id = p_finding_id;
  RETURN jsonb_build_object('finding_id', p_finding_id, 'finding_status', 'reviewed', 'reviewer_note', v_note);
END;
$$;

REVOKE ALL ON FUNCTION public.app_record_precheck(TEXT, TEXT, JSONB, TEXT, TEXT, UUID, JSONB, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_record_precheck(TEXT, TEXT, JSONB, TEXT, TEXT, UUID, JSONB, INTEGER, JSONB) TO service_role;
REVOKE ALL ON FUNCTION public.app_save_content_check(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_save_content_check(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.app_review_finding(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_review_finding(UUID, TEXT) TO authenticated;

-- ---- FR-010, BR-005: M2's dossier check, read by SC-27 and by the M0 readiness view (lib/db/dossier-view.sql,
-- lib/db/readiness-view.sql — the text below is their PostgreSQL rendering). The readiness views are re-created because
-- the Dossier gauge now reads v_dossier_check; v_dossier_check itself has no API grant (the System actor reads it).
DROP VIEW IF EXISTS public.v_project_readiness;
DROP VIEW IF EXISTS app.project_readiness;
DROP VIEW IF EXISTS public.v_dossier_check;
CREATE VIEW public.v_dossier_check AS
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
WHERE EXISTS (SELECT 1 FROM segment_requirement g WHERE g.segment = p.segment AND g.requirement_code = 'GAUGE_DOSSIER');
REVOKE ALL ON public.v_dossier_check FROM PUBLIC, anon, authenticated;

CREATE VIEW app.project_readiness AS
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
      SELECT string_agg(dt.doc_code, ',' ORDER BY dt.doc_code)
      FROM document_type dt
      WHERE SUBSTR(dt.doc_code, 1, 4) = 'A13_'
        AND NOT EXISTS (SELECT 1 FROM v_dossier_check dc
                        WHERE dc.project_id = f.project_id AND dc.doc_code = dt.doc_code AND dc.state = 'present')
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
      (SELECT COUNT(*) FROM v_dossier_check dc WHERE dc.project_id = p.project_id AND dc.state = 'present') AS a13_present,
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
) s;
REVOKE ALL ON app.project_readiness FROM PUBLIC, anon, authenticated;

CREATE VIEW public.v_project_readiness AS
SELECT * FROM app.project_readiness WHERE app.is_project_member(project_id);
REVOKE ALL ON public.v_project_readiness FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_project_readiness TO authenticated;

-- ---- M0 question 2 (decided 07/11/2026, M2 plan D10): the buffer before shooting is editable on SC-29 (0, 7, 14, 21)
-- Same signature and grants as 20261103000200_m0_readiness.sql; buffer_days added to the M0 checks.
CREATE OR REPLACE FUNCTION public.app_update_project(p_project_id uuid, p_fields jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_permission text := app.project_permission(p_project_id);
  v_stage text;
  v_org uuid;
  v_updated timestamptz;
BEGIN
  IF v_permission IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF v_permission NOT IN ('owner', 'edit') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT p.stage, p.producer_org_id INTO v_stage, v_org FROM public.project p WHERE p.project_id = p_project_id;
  IF v_stage = 'archived' THEN
    RAISE EXCEPTION 'ARCHIVED';
  END IF;
  IF p_fields ? 'stage' AND p_fields->>'stage' NOT IN ('draft', 'preparing') THEN
    RAISE EXCEPTION 'INVALID_STAGE';
  END IF;
  IF p_fields ? 'buffer_days' AND (jsonb_typeof(p_fields->'buffer_days') <> 'number' OR (p_fields->>'buffer_days') NOT IN ('0', '7', '14', '21')
      OR (p_fields->>'buffer_days')::integer NOT IN (0, 7, 14, 21)) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF p_fields ? 'project_name' AND EXISTS (
      SELECT 1 FROM public.project p
       WHERE p.producer_org_id = v_org AND p.project_name = btrim(p_fields->>'project_name') AND p.project_id <> p_project_id) THEN
    RAISE EXCEPTION 'NAME_TAKEN';
  END IF;

  UPDATE public.project p
     SET project_name = CASE WHEN p_fields ? 'project_name' THEN btrim(p_fields->>'project_name') ELSE p.project_name END,
         shoot_date = CASE WHEN p_fields ? 'shoot_date' THEN (p_fields->>'shoot_date')::date ELSE p.shoot_date END,
         logline = CASE WHEN p_fields ? 'logline' THEN p_fields->>'logline' ELSE p.logline END,
         stage = CASE WHEN p_fields ? 'stage' THEN p_fields->>'stage' ELSE p.stage END,
         buffer_days = CASE WHEN p_fields ? 'buffer_days' THEN (p_fields->>'buffer_days')::integer ELSE p.buffer_days END,
         updated_at = now()
   WHERE p.project_id = p_project_id
  RETURNING p.updated_at INTO v_updated;
  RETURN jsonb_build_object('project_id', p_project_id, 'updated_at', v_updated);
END;
$$;
REVOKE ALL ON FUNCTION public.app_update_project(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_update_project(uuid, jsonb) TO authenticated;

-- ---- US-3: the VFDA Legal Board writes, revises, signs and retires rules (FR-001..FR-004, BR-002, BR-008, Q2, Q13).
-- Only vfda_legal — not the admin hierarchy of app.has_role (D9, exception to SYS question 5). One audit row each.
CREATE OR REPLACE FUNCTION public.app_save_rule_draft(p_rule_id UUID, p_fields JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_id UUID := p_rule_id;
  v_code TEXT := btrim(COALESCE(p_fields ->> 'rule_code', ''));
  v_status TEXT;
  v_revision INTEGER;
BEGIN
  IF auth.uid() IS NULL OR app.current_role() <> 'vfda_legal' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_rule_id IS NULL THEN
    IF v_code !~ '^[A-Z0-9-]{1,40}$' OR COALESCE(btrim(p_fields ->> 'title_vi'), '') = '' OR COALESCE(btrim(p_fields ->> 'title_en'), '') = ''
       OR COALESCE(btrim(p_fields ->> 'description_vi'), '') = '' OR COALESCE(btrim(p_fields ->> 'description_en'), '') = ''
       OR COALESCE(btrim(p_fields ->> 'guidance_vi'), '') = '' OR COALESCE(btrim(p_fields ->> 'guidance_en'), '') = ''
       OR COALESCE(p_fields ->> 'severity', '') NOT IN ('notice', 'action')
       OR COALESCE(p_fields ->> 'topic', '') NOT IN ('security', 'history', 'religion', 'privacy', 'dossier', 'public_order', 'heritage')
       OR jsonb_typeof(p_fields -> 'segments') IS DISTINCT FROM 'array' OR jsonb_array_length(p_fields -> 'segments') = 0 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR';
    END IF;
    IF EXISTS (SELECT 1 FROM public.legal_rule r WHERE r.rule_code = v_code) THEN RAISE EXCEPTION 'CODE_EXISTS'; END IF;
    v_id := gen_random_uuid();
    INSERT INTO public.legal_rule (rule_id, rule_code, revision, rule_version, title_vi, title_en, description_vi, description_en, guidance_vi,
      guidance_en, citation, severity, topic, rule_slug, status, approved_by, approved_at, is_active, keywords_vi, keywords_en, segments,
      retired_version, is_sample)
    VALUES (v_id, v_code, 1, NULL, btrim(p_fields ->> 'title_vi'), btrim(p_fields ->> 'title_en'), btrim(p_fields ->> 'description_vi'),
      btrim(p_fields ->> 'description_en'), btrim(p_fields ->> 'guidance_vi'), btrim(p_fields ->> 'guidance_en'),
      NULLIF(btrim(COALESCE(p_fields ->> 'citation', '')), ''), p_fields ->> 'severity', p_fields ->> 'topic', lower(v_code), 'draft', NULL, NULL,
      false, p_fields -> 'keywords_vi', p_fields -> 'keywords_en', p_fields -> 'segments', NULL, false);
  ELSE
    SELECT r.status INTO v_status FROM public.legal_rule r WHERE r.rule_id = p_rule_id;
    IF v_status IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
    IF v_status <> 'draft' THEN RAISE EXCEPTION 'NOT_DRAFT'; END IF;
    UPDATE public.legal_rule r
       SET title_vi = CASE WHEN p_fields ? 'title_vi' THEN btrim(p_fields ->> 'title_vi') ELSE r.title_vi END,
           title_en = CASE WHEN p_fields ? 'title_en' THEN btrim(p_fields ->> 'title_en') ELSE r.title_en END,
           description_vi = CASE WHEN p_fields ? 'description_vi' THEN btrim(p_fields ->> 'description_vi') ELSE r.description_vi END,
           description_en = CASE WHEN p_fields ? 'description_en' THEN btrim(p_fields ->> 'description_en') ELSE r.description_en END,
           guidance_vi = CASE WHEN p_fields ? 'guidance_vi' THEN btrim(p_fields ->> 'guidance_vi') ELSE r.guidance_vi END,
           guidance_en = CASE WHEN p_fields ? 'guidance_en' THEN btrim(p_fields ->> 'guidance_en') ELSE r.guidance_en END,
           citation = CASE WHEN p_fields ? 'citation' THEN NULLIF(btrim(COALESCE(p_fields ->> 'citation', '')), '') ELSE r.citation END,
           severity = CASE WHEN p_fields ? 'severity' THEN p_fields ->> 'severity' ELSE r.severity END,
           topic = CASE WHEN p_fields ? 'topic' THEN p_fields ->> 'topic' ELSE r.topic END,
           keywords_vi = CASE WHEN p_fields ? 'keywords_vi' THEN p_fields -> 'keywords_vi' ELSE r.keywords_vi END,
           keywords_en = CASE WHEN p_fields ? 'keywords_en' THEN p_fields -> 'keywords_en' ELSE r.keywords_en END,
           segments = CASE WHEN p_fields ? 'segments' THEN p_fields -> 'segments' ELSE r.segments END
     WHERE r.rule_id = p_rule_id;
    IF EXISTS (SELECT 1 FROM public.legal_rule r WHERE r.rule_id = p_rule_id AND (btrim(r.title_vi) = '' OR btrim(r.title_en) = ''
        OR btrim(r.description_vi) = '' OR btrim(r.description_en) = '' OR btrim(r.guidance_vi) = '' OR btrim(r.guidance_en) = ''
        OR jsonb_array_length(r.segments) = 0)) THEN
      RAISE EXCEPTION 'VALIDATION_ERROR';
    END IF;
  END IF;
  SELECT r.revision INTO v_revision FROM public.legal_rule r WHERE r.rule_id = v_id;
  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at) VALUES (gen_random_uuid(), 'rule.save', auth.uid(), v_id, now());
  RETURN jsonb_build_object('rule_id', v_id, 'revision', v_revision, 'status', 'draft');
END;
$$;

CREATE OR REPLACE FUNCTION public.app_revise_rule(p_rule_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_code TEXT;
  v_status TEXT;
  v_id UUID := gen_random_uuid();
  v_revision INTEGER;
BEGIN
  IF auth.uid() IS NULL OR app.current_role() <> 'vfda_legal' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT r.rule_code, r.status INTO v_code, v_status FROM public.legal_rule r WHERE r.rule_id = p_rule_id;
  IF v_code IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_status <> 'approved' THEN RAISE EXCEPTION 'NOT_APPROVED'; END IF;
  IF EXISTS (SELECT 1 FROM public.legal_rule r WHERE r.rule_code = v_code AND r.status = 'draft') THEN RAISE EXCEPTION 'DRAFT_EXISTS'; END IF;
  SELECT max(r.revision) + 1 INTO v_revision FROM public.legal_rule r WHERE r.rule_code = v_code;
  -- Q13: a copy of the signed text as a new draft; the signed revision stays in force until this one is signed
  INSERT INTO public.legal_rule (rule_id, rule_code, revision, rule_version, title_vi, title_en, description_vi, description_en, guidance_vi,
    guidance_en, citation, severity, topic, rule_slug, status, approved_by, approved_at, is_active, keywords_vi, keywords_en, segments,
    retired_version, is_sample)
  SELECT v_id, r.rule_code, v_revision, NULL, r.title_vi, r.title_en, r.description_vi, r.description_en, r.guidance_vi, r.guidance_en,
         r.citation, r.severity, r.topic, r.rule_slug, 'draft', NULL, NULL, false, r.keywords_vi, r.keywords_en, r.segments, NULL, r.is_sample
    FROM public.legal_rule r WHERE r.rule_id = p_rule_id;
  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at) VALUES (gen_random_uuid(), 'rule.revise', auth.uid(), v_id, now());
  RETURN jsonb_build_object('rule_id', v_id, 'revision', v_revision, 'status', 'draft');
END;
$$;

CREATE OR REPLACE FUNCTION public.app_sign_rule(p_rule_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_code TEXT;
  v_status TEXT;
  v_version TEXT;
  v_old UUID;
BEGIN
  IF auth.uid() IS NULL OR app.current_role() <> 'vfda_legal' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT r.rule_code, r.status INTO v_code, v_status FROM public.legal_rule r WHERE r.rule_id = p_rule_id;
  IF v_code IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_status <> 'draft' THEN RAISE EXCEPTION 'NOT_DRAFT'; END IF;
  IF EXISTS (SELECT 1 FROM public.legal_rule r WHERE r.rule_id = p_rule_id AND (btrim(r.title_vi) = '' OR btrim(r.title_en) = ''
      OR btrim(r.description_vi) = '' OR btrim(r.description_en) = '' OR btrim(r.guidance_vi) = '' OR btrim(r.guidance_en) = ''
      OR jsonb_array_length(r.segments) = 0)) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  -- FR-004, Q13: every signature makes a rule-set version; the previous approved revision leaves the set in it
  v_version := app.next_rule_version();
  INSERT INTO public.rule_set_version (rule_version, created_at, created_by) VALUES (v_version, now(), auth.uid());
  SELECT r.rule_id INTO v_old FROM public.legal_rule r WHERE r.rule_code = v_code AND r.status = 'approved';
  IF v_old IS NOT NULL THEN
    UPDATE public.legal_rule SET status = 'retired', is_active = false, retired_version = v_version WHERE rule_id = v_old;
  END IF;
  -- BR-002: no pre-check of the citation here — ck_legal_rule_approved_needs_signature refuses a rule without it
  UPDATE public.legal_rule
     SET status = 'approved', is_active = true, approved_by = auth.uid(), approved_at = now(), rule_version = v_version
   WHERE rule_id = p_rule_id;
  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at) VALUES (gen_random_uuid(), 'rule.sign', auth.uid(), p_rule_id, now());
  RETURN jsonb_build_object('rule_version', v_version, 'retired_rule_id', v_old);
END;
$$;

CREATE OR REPLACE FUNCTION public.app_retire_rule(p_rule_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
  v_version TEXT;
BEGIN
  IF auth.uid() IS NULL OR app.current_role() <> 'vfda_legal' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT r.status INTO v_status FROM public.legal_rule r WHERE r.rule_id = p_rule_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_status <> 'approved' THEN RAISE EXCEPTION 'NOT_APPROVED'; END IF;
  -- Q13: retiring a rule creates a rule-set version; BR-008: retired, never deleted
  v_version := app.next_rule_version();
  INSERT INTO public.rule_set_version (rule_version, created_at, created_by) VALUES (v_version, now(), auth.uid());
  UPDATE public.legal_rule SET status = 'retired', is_active = false, retired_version = v_version WHERE rule_id = p_rule_id;
  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at) VALUES (gen_random_uuid(), 'rule.retire', auth.uid(), p_rule_id, now());
  RETURN jsonb_build_object('rule_version', v_version);
END;
$$;

REVOKE ALL ON FUNCTION public.app_save_rule_draft(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_save_rule_draft(UUID, JSONB) TO authenticated;
REVOKE ALL ON FUNCTION public.app_revise_rule(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_revise_rule(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.app_sign_rule(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_sign_rule(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.app_retire_rule(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_retire_rule(UUID) TO authenticated;
