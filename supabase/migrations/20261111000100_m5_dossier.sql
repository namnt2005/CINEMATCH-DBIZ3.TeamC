-- M5 dossier kit, bilingual drafts and countdown (specs/009-m5-dossier data-model §2–§7, research R1–R14).
-- New databases already get the D1 columns, the table location_document_type and the read policies from
-- 20261101000100_schema.sql and 20261101000300_grants_rls.sql (regenerated from data/schema and tools/rls_policies.py);
-- this file brings databases pushed before 11/11/2026 to the same shape (every statement is safe on both shapes),
-- closes every direct write, adds the private bucket, the permission helpers and the write functions. The D1 rows
-- themselves (requirement codes, the segment C types, the location links) come with node scripts/seed-supabase.mjs --reset.

-- ---- D1: the kit configuration --------------------------------------------------------------------------------
ALTER TABLE public.document_type
    ADD COLUMN IF NOT EXISTS requirement_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS awaiting_confirmation BOOLEAN;
UPDATE public.document_type SET awaiting_confirmation = (segments @> '["C"]'::jsonb) WHERE awaiting_confirmation IS NULL;
ALTER TABLE public.document_type ALTER COLUMN awaiting_confirmation SET NOT NULL;
ALTER TABLE public.document_type DROP CONSTRAINT IF EXISTS ck_document_type_location_no_requirement;
ALTER TABLE public.document_type ADD CONSTRAINT ck_document_type_location_no_requirement CHECK (basis <> 'location' OR requirement_code IS NULL);

CREATE TABLE IF NOT EXISTS public.location_document_type (
    location_id UUID NOT NULL,
    doc_code VARCHAR(40) NOT NULL,
    CONSTRAINT pk_location_document_type PRIMARY KEY (location_id, doc_code),
    CONSTRAINT fk_location_document_type_location_id FOREIGN KEY (location_id) REFERENCES public.location (location_id),
    CONSTRAINT fk_location_document_type_doc_code FOREIGN KEY (doc_code) REFERENCES public.document_type (doc_code)
);
ALTER TABLE public.location_document_type ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.location_document_type FROM anon, authenticated;
GRANT SELECT ON public.location_document_type TO authenticated;

-- ---- R12: read policies of data-model §7 (copies of 20261101000300_grants_rls.sql) -----------------------------
GRANT SELECT ON public.bilingual_document, public.bilingual_paragraph, public.project_glossary TO authenticated;
DROP POLICY IF EXISTS rls_location_document_type_select_signed_in ON public.location_document_type;
CREATE POLICY rls_location_document_type_select_signed_in ON public.location_document_type FOR SELECT TO authenticated
  USING (app.current_role() <> 'guest');
DROP POLICY IF EXISTS rls_bilingual_document_select_member ON public.bilingual_document;
CREATE POLICY rls_bilingual_document_select_member ON public.bilingual_document FOR SELECT TO authenticated
  USING (app.is_project_member(project_id));
DROP POLICY IF EXISTS rls_bilingual_document_partner ON public.bilingual_document;
CREATE POLICY rls_bilingual_document_partner ON public.bilingual_document FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.collab_request r JOIN public.organisation_user ou ON ou.org_id = r.org_id AND ou.user_id = auth.uid() WHERE r.project_id = bilingual_document.project_id AND r.status IN ('accepted', 'confirmed') AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'producer' AND n.accepted) AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'partner' AND n.accepted)) AND app.has_role('partner'));
DROP POLICY IF EXISTS rls_bilingual_paragraph_select_member ON public.bilingual_paragraph;
CREATE POLICY rls_bilingual_paragraph_select_member ON public.bilingual_paragraph FOR SELECT TO authenticated
  USING (app.is_project_member(project_id));
DROP POLICY IF EXISTS rls_bilingual_paragraph_partner ON public.bilingual_paragraph;
CREATE POLICY rls_bilingual_paragraph_partner ON public.bilingual_paragraph FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.collab_request r JOIN public.organisation_user ou ON ou.org_id = r.org_id AND ou.user_id = auth.uid() WHERE r.project_id = bilingual_paragraph.project_id AND r.status IN ('accepted', 'confirmed') AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'producer' AND n.accepted) AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'partner' AND n.accepted)) AND app.has_role('partner'));
DROP POLICY IF EXISTS rls_project_glossary_select_member ON public.project_glossary;
CREATE POLICY rls_project_glossary_select_member ON public.project_glossary FOR SELECT TO authenticated
  USING (app.is_project_member(project_id));
DROP POLICY IF EXISTS rls_project_glossary_partner ON public.project_glossary;
CREATE POLICY rls_project_glossary_partner ON public.project_glossary FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.collab_request r JOIN public.organisation_user ou ON ou.org_id = r.org_id AND ou.user_id = auth.uid() WHERE r.project_id = project_glossary.project_id AND r.status IN ('accepted', 'confirmed') AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'producer' AND n.accepted) AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'partner' AND n.accepted)) AND app.has_role('partner'));

-- ---- R12: every write goes through the functions below -------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.document_slot FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.document FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.bilingual_document FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.bilingual_paragraph FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.project_glossary FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.location_document_type FROM anon, authenticated;
DROP POLICY IF EXISTS rls_document_insert_member ON public.document;

-- ---- D4: who reads, proofreads and confirms a draft (a partner only behind M4's NDA gate) --------------------
CREATE OR REPLACE FUNCTION app.can_read_draft(p_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT app.is_project_member(p_project_id)
      OR (EXISTS (SELECT 1 FROM public.collab_request r
                 JOIN public.organisation_user ou ON ou.org_id = r.org_id AND ou.user_id = auth.uid()
                WHERE r.project_id = p_project_id AND r.status IN ('accepted', 'confirmed')
                  AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'producer' AND n.accepted)
                  AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'partner' AND n.accepted))
       AND app.has_role('partner'))
$$;
CREATE OR REPLACE FUNCTION app.can_proofread(p_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COALESCE(app.project_permission(p_project_id) IN ('owner', 'edit'), false)
      OR (EXISTS (SELECT 1 FROM public.collab_request r
                 JOIN public.organisation_user ou ON ou.org_id = r.org_id AND ou.user_id = auth.uid()
                WHERE r.project_id = p_project_id AND r.status IN ('accepted', 'confirmed')
                  AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'producer' AND n.accepted)
                  AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'partner' AND n.accepted))
       AND app.has_role('partner'))
$$;
CREATE OR REPLACE FUNCTION app.can_confirm_draft(p_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.collab_request r
                 JOIN public.organisation_user ou ON ou.org_id = r.org_id AND ou.user_id = auth.uid()
                WHERE r.project_id = p_project_id AND r.status IN ('confirmed')
                  AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'producer' AND n.accepted)
                  AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'partner' AND n.accepted))
       AND app.has_role('partner')
$$;
REVOKE ALL ON FUNCTION app.can_read_draft(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app.can_proofread(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION app.can_confirm_draft(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app.can_read_draft(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app.can_proofread(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app.can_confirm_draft(uuid) TO authenticated;

-- ---- R3: private bucket for project documents; no object policy (signed URLs from the server) ----------------
DO $storage$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('project-documents', 'project-documents', false, 26214400,
            '{application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document}')
    ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 26214400,
       allowed_mime_types = '{application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document}';
  END IF;
END
$storage$;

-- ---- FR-002, R2: record an uploaded version (the server has checked the stored object and the kit first) -------
-- The first upload creates the slot as present; a replacement adds a version, the old ones are kept.
CREATE OR REPLACE FUNCTION public.app_record_document(p_project_id uuid, p_doc_code text, p_file_path text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_perm text;
  v_stage text;
  v_version integer;
  v_id uuid := gen_random_uuid();
BEGIN
  IF auth.uid() IS NULL OR app.current_role() = 'guest' THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  v_perm := app.project_permission(p_project_id);
  SELECT stage INTO v_stage FROM public.project WHERE project_id = p_project_id;
  IF v_stage IS NULL OR v_perm IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_perm NOT IN ('owner', 'edit') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_stage = 'archived' THEN RAISE EXCEPTION 'ARCHIVED'; END IF;
  -- the provincial notice copy takes its state from M7 and has no upload (analysis U3)
  IF p_doc_code = 'PROVINCIAL_NOTICE_COPY' OR NOT EXISTS (SELECT 1 FROM public.document_type t WHERE t.doc_code = p_doc_code) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF p_file_path IS NULL OR position('..' in p_file_path) > 0 OR NOT (p_file_path LIKE p_project_id::text || '/' || p_doc_code || '/%') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  INSERT INTO public.document_slot (project_id, doc_code, state) VALUES (p_project_id, p_doc_code, 'present')
    ON CONFLICT (project_id, doc_code) DO UPDATE SET state = 'present';
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version FROM public.document WHERE project_id = p_project_id AND doc_code = p_doc_code;
  INSERT INTO public.document (document_id, project_id, doc_code, file_path, version, uploaded_by, uploaded_at)
    VALUES (v_id, p_project_id, p_doc_code, p_file_path, v_version, auth.uid(), now());
  RETURN jsonb_build_object('document_id', v_id, 'version', v_version);
END
$$;
REVOKE ALL ON FUNCTION public.app_record_document(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_record_document(uuid, text, text) TO authenticated;

-- ---- FR-004..FR-006, BR-002, BR-006, D4: drafts, proofreading, glossary -------------------------------------
-- Owner or edit members create drafts and keep the glossary; proofreading is open to them and, behind M4's NDA gate,
-- to the project's partner (app.can_proofread); only the confirmed partner confirms a whole document. Component b
-- follows the paragraphs: the last proofread sets the slot present, an edit of a proofread paragraph lowers it.
CREATE OR REPLACE FUNCTION public.app_create_bilingual(p_project_id uuid, p_doc_code text, p_synopsis_en text, p_paragraphs jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_perm text;
  v_project public.project%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR app.current_role() = 'guest' THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  v_perm := app.project_permission(p_project_id);
  SELECT * INTO v_project FROM public.project WHERE project_id = p_project_id;
  IF v_project.project_id IS NULL OR v_perm IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_perm NOT IN ('owner', 'edit') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_project.stage = 'archived' THEN RAISE EXCEPTION 'ARCHIVED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.document_type t WHERE t.doc_code = p_doc_code) THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF jsonb_typeof(p_paragraphs) <> 'array' OR jsonb_array_length(p_paragraphs) NOT BETWEEN 1 AND 100
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_paragraphs) e WHERE jsonb_typeof(e) <> 'string' OR length(e #>> '{}') NOT BETWEEN 1 AND 4000) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  INSERT INTO public.bilingual_document (project_id, doc_code, structure_version, synopsis_en, project_meta, pdf_url)
    VALUES (p_project_id, p_doc_code,
            CASE WHEN p_doc_code = 'A13_SCRIPT_VI' THEN 'art13-script-v1' ELSE replace(lower(p_doc_code), '_', '-') || '-v1' END,
            p_synopsis_en,
            jsonb_build_object('title', v_project.project_name, 'segment', v_project.segment, 'format', v_project.format, 'shoot_date', v_project.shoot_date),
            NULL)
    ON CONFLICT (project_id, doc_code) DO UPDATE SET synopsis_en = EXCLUDED.synopsis_en, project_meta = EXCLUDED.project_meta,
       structure_version = EXCLUDED.structure_version, pdf_url = NULL;
  DELETE FROM public.bilingual_paragraph WHERE project_id = p_project_id AND doc_code = p_doc_code;
  INSERT INTO public.bilingual_paragraph (project_id, doc_code, idx, source_text, target_text, status)
    SELECT p_project_id, p_doc_code, e.ord::integer, e.value #>> '{}', '', 'machine'
      FROM jsonb_array_elements(p_paragraphs) WITH ORDINALITY AS e(value, ord);
  -- a new draft is not proofread: a present script slot built from the old draft goes back to needs_fix
  UPDATE public.document_slot SET state = 'needs_fix' WHERE project_id = p_project_id AND doc_code = p_doc_code AND state = 'present';
  RETURN jsonb_array_length(p_paragraphs);
END
$$;

CREATE OR REPLACE FUNCTION public.app_edit_paragraph(p_project_id uuid, p_doc_code text, p_idx integer, p_text text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_was text;
  v_slot text;
BEGIN
  IF auth.uid() IS NULL OR app.current_role() = 'guest' THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT app.can_read_draft(p_project_id) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT app.can_proofread(p_project_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF EXISTS (SELECT 1 FROM public.project WHERE project_id = p_project_id AND stage = 'archived') THEN RAISE EXCEPTION 'ARCHIVED'; END IF;
  IF p_text IS NULL OR length(p_text) > 8000 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  SELECT status INTO v_was FROM public.bilingual_paragraph WHERE project_id = p_project_id AND doc_code = p_doc_code AND idx = p_idx;
  IF v_was IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  UPDATE public.bilingual_paragraph
     SET target_text = btrim(p_text), status = 'machine', reviewed_by = NULL, reviewer_org_id = NULL, reviewed_at = NULL
   WHERE project_id = p_project_id AND doc_code = p_doc_code AND idx = p_idx;
  IF v_was = 'reviewed' THEN
    UPDATE public.document_slot SET state = 'needs_fix' WHERE project_id = p_project_id AND doc_code = p_doc_code AND state = 'present';
  END IF;
  SELECT state INTO v_slot FROM public.document_slot WHERE project_id = p_project_id AND doc_code = p_doc_code;
  RETURN jsonb_build_object('idx', p_idx, 'status', 'machine', 'slot_state', COALESCE(v_slot, 'missing'));
END
$$;

CREATE OR REPLACE FUNCTION app.draft_reviewer_org(p_project_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE WHEN COALESCE(app.project_permission(p_project_id) IN ('owner', 'edit'), false) THEN NULL ELSE (
    SELECT r.org_id FROM public.collab_request r
      JOIN public.organisation_user ou ON ou.org_id = r.org_id AND ou.user_id = auth.uid()
     WHERE r.project_id = p_project_id AND r.status IN ('accepted', 'confirmed')
       AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'producer' AND n.accepted)
       AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'partner' AND n.accepted)
     ORDER BY r.status = 'confirmed' DESC LIMIT 1) END
$$;
REVOKE ALL ON FUNCTION app.draft_reviewer_org(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app.draft_reviewer_org(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.app_review_paragraph(p_project_id uuid, p_doc_code text, p_idx integer)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_target text;
  v_reviewed integer;
  v_total integer;
  v_slot text;
BEGIN
  IF auth.uid() IS NULL OR app.current_role() = 'guest' THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT app.can_read_draft(p_project_id) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT app.can_proofread(p_project_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF EXISTS (SELECT 1 FROM public.project WHERE project_id = p_project_id AND stage = 'archived') THEN RAISE EXCEPTION 'ARCHIVED'; END IF;
  SELECT target_text INTO v_target FROM public.bilingual_paragraph WHERE project_id = p_project_id AND doc_code = p_doc_code AND idx = p_idx;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF COALESCE(btrim(v_target), '') = '' THEN RAISE EXCEPTION 'EMPTY_PARAGRAPH'; END IF;
  UPDATE public.bilingual_paragraph
     SET status = 'reviewed', reviewed_by = auth.uid(), reviewer_org_id = app.draft_reviewer_org(p_project_id), reviewed_at = now()
   WHERE project_id = p_project_id AND doc_code = p_doc_code AND idx = p_idx AND status <> 'reviewed';
  IF NOT EXISTS (SELECT 1 FROM public.bilingual_paragraph p WHERE p.project_id = p_project_id AND p.doc_code = p_doc_code AND p.status <> 'reviewed') THEN
    INSERT INTO public.document_slot (project_id, doc_code, state) VALUES (p_project_id, p_doc_code, 'present')
      ON CONFLICT (project_id, doc_code) DO UPDATE SET state = 'present';
  END IF;
  SELECT count(*) FILTER (WHERE status = 'reviewed'), count(*) INTO v_reviewed, v_total
    FROM public.bilingual_paragraph WHERE project_id = p_project_id AND doc_code = p_doc_code;
  SELECT state INTO v_slot FROM public.document_slot WHERE project_id = p_project_id AND doc_code = p_doc_code;
  RETURN jsonb_build_object('idx', p_idx, 'status', 'reviewed', 'reviewed', v_reviewed, 'total', v_total, 'slot_state', COALESCE(v_slot, 'missing'));
END
$$;

CREATE OR REPLACE FUNCTION public.app_confirm_bilingual(p_project_id uuid, p_doc_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_marked integer;
  v_total integer;
BEGIN
  IF auth.uid() IS NULL OR app.current_role() = 'guest' THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF NOT app.can_read_draft(p_project_id) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT app.can_confirm_draft(p_project_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF EXISTS (SELECT 1 FROM public.project WHERE project_id = p_project_id AND stage = 'archived') THEN RAISE EXCEPTION 'ARCHIVED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bilingual_document WHERE project_id = p_project_id AND doc_code = p_doc_code) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF EXISTS (SELECT 1 FROM public.bilingual_paragraph WHERE project_id = p_project_id AND doc_code = p_doc_code AND COALESCE(btrim(target_text), '') = '') THEN
    RAISE EXCEPTION 'EMPTY_PARAGRAPH';
  END IF;
  UPDATE public.bilingual_paragraph
     SET status = 'reviewed', reviewed_by = auth.uid(), reviewer_org_id = app.draft_reviewer_org(p_project_id), reviewed_at = now()
   WHERE project_id = p_project_id AND doc_code = p_doc_code AND status <> 'reviewed';
  GET DIAGNOSTICS v_marked = ROW_COUNT;
  IF NOT EXISTS (SELECT 1 FROM public.bilingual_paragraph p WHERE p.project_id = p_project_id AND p.doc_code = p_doc_code AND p.status <> 'reviewed') THEN
    INSERT INTO public.document_slot (project_id, doc_code, state) VALUES (p_project_id, p_doc_code, 'present')
      ON CONFLICT (project_id, doc_code) DO UPDATE SET state = 'present';
  END IF;
  SELECT count(*) INTO v_total FROM public.bilingual_paragraph WHERE project_id = p_project_id AND doc_code = p_doc_code;
  RETURN jsonb_build_object('marked', v_marked, 'reviewed', v_total, 'total', v_total, 'slot_state', 'present');
END
$$;

CREATE OR REPLACE FUNCTION public.app_set_bilingual_pdf(p_project_id uuid, p_doc_code text, p_path text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR app.current_role() = 'guest' THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF app.project_permission(p_project_id) IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF app.project_permission(p_project_id) NOT IN ('owner', 'edit') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF EXISTS (SELECT 1 FROM public.project WHERE project_id = p_project_id AND stage = 'archived') THEN RAISE EXCEPTION 'ARCHIVED'; END IF;
  IF p_path IS NULL OR position('..' in p_path) > 0 OR NOT (p_path LIKE p_project_id::text || '/' || p_doc_code || '/drafts/%') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  UPDATE public.bilingual_document SET pdf_url = p_path WHERE project_id = p_project_id AND doc_code = p_doc_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN true;
END
$$;

CREATE OR REPLACE FUNCTION public.app_save_glossary_term(p_project_id uuid, p_term_en text, p_term_vi text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_en text := btrim(COALESCE(p_term_en, ''));
  v_vi text := btrim(COALESCE(p_term_vi, ''));
BEGIN
  IF auth.uid() IS NULL OR app.current_role() = 'guest' THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF app.project_permission(p_project_id) IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF app.project_permission(p_project_id) NOT IN ('owner', 'edit') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF EXISTS (SELECT 1 FROM public.project WHERE project_id = p_project_id AND stage = 'archived') THEN RAISE EXCEPTION 'ARCHIVED'; END IF;
  IF length(v_en) NOT BETWEEN 1 AND 120 OR length(v_vi) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  -- one translation per English term, whatever its case
  DELETE FROM public.project_glossary WHERE project_id = p_project_id AND lower(term_en) = lower(v_en);
  IF (SELECT count(*) FROM public.project_glossary WHERE project_id = p_project_id) >= 200 THEN RAISE EXCEPTION 'LIMIT'; END IF;
  INSERT INTO public.project_glossary (project_id, term_en, term_vi) VALUES (p_project_id, v_en, v_vi);
  RETURN jsonb_build_object('term_en', v_en, 'term_vi', v_vi);
END
$$;

CREATE OR REPLACE FUNCTION public.app_delete_glossary_term(p_project_id uuid, p_term_en text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR app.current_role() = 'guest' THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  IF app.project_permission(p_project_id) IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF app.project_permission(p_project_id) NOT IN ('owner', 'edit') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF EXISTS (SELECT 1 FROM public.project WHERE project_id = p_project_id AND stage = 'archived') THEN RAISE EXCEPTION 'ARCHIVED'; END IF;
  DELETE FROM public.project_glossary WHERE project_id = p_project_id AND lower(term_en) = lower(btrim(COALESCE(p_term_en, '')));
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN true;
END
$$;

REVOKE ALL ON FUNCTION public.app_create_bilingual(uuid, text, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_edit_paragraph(uuid, text, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_review_paragraph(uuid, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_confirm_bilingual(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_set_bilingual_pdf(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_save_glossary_term(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_delete_glossary_term(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_create_bilingual(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_edit_paragraph(uuid, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_review_paragraph(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_confirm_bilingual(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_set_bilingual_pdf(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_save_glossary_term(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_delete_glossary_term(uuid, text) TO authenticated;
