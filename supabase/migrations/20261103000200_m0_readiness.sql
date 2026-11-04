-- M0 readiness view, write functions and nightly snapshot (specs/005-m0-workspace research R3, R6, R10).
-- The view body is lib/db/readiness-view.sql rendered for PostgreSQL (tests/unit/readiness-render.test.js keeps
-- them identical). Writes go through SECURITY DEFINER functions that check the caller's permission on the project.
-- Projects are archived, never deleted (BR-005): no function here removes a row.

-- ---- The view (BR-001..BR-004) -----------------------------------------------------------------------
-- app.project_readiness: every project, for the nightly snapshot. Not readable through the API.
CREATE OR REPLACE VIEW app.project_readiness AS
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
  CASE WHEN s.count_content + s.count_locations + s.count_partners + s.count_dossier = 0 THEN 0
       ELSE ROUND((s.content_score * s.count_content + s.locations_score * s.count_locations
                   + s.partners_score * s.count_partners + COALESCE(s.dossier_score, 0) * s.count_dossier)
                  / (s.count_content + s.count_locations + s.count_partners + s.count_dossier), 2) END AS readiness_total,
  s.content_action,
  s.locations_action,
  s.partners_action,
  s.dossier_action,
  s.logistics_action,
  s.content_open_findings,
  s.dossier_missing,
  CASE WHEN s.content_action IS NOT NULL AND s.content_action <> 'done' THEN s.content_action
       WHEN s.locations_action IS NOT NULL AND s.locations_action <> 'done' THEN s.locations_action
       WHEN s.partners_action IS NOT NULL AND s.partners_action <> 'done' THEN s.partners_action
       WHEN s.dossier_action IS NOT NULL AND s.dossier_action <> 'done' THEN s.dossier_action
       ELSE 'done' END AS next_action_primary
FROM (
  SELECT
    f.*,
    CASE WHEN f.run_id IS NULL THEN 0.0
         ELSE 30.0 + (CASE WHEN f.run_current = 1 THEN 30.0 ELSE 0.0 END)
              + (CASE WHEN f.findings_total = 0 THEN 40.0 ELSE 40.0 * f.findings_reviewed / f.findings_total END) END AS content_score,
    CASE WHEN f.shortlist_n = 0 THEN 0.0 ELSE 50.0 + 25.0 * f.has_primary + 25.0 * f.has_backup END AS locations_score,
    CASE WHEN f.requests_confirmed > 0 THEN 100.0 WHEN f.requests_accepted > 0 THEN 70.0
         WHEN f.requests_total > 0 THEN 30.0 ELSE 0.0 END AS partners_score,
    CASE WHEN f.show_dossier = 1 THEN 100.0 * f.a13_present / f.a13_types END AS dossier_score,
    CASE WHEN f.show_content = 0 THEN NULL
         WHEN f.run_id IS NULL THEN 'content.start_precheck'
         WHEN f.run_current = 0 THEN 'content.recheck_new_rules'
         WHEN f.findings_reviewed < f.findings_total THEN 'content.review_findings'
         ELSE 'done' END AS content_action,
    CASE WHEN f.show_locations = 0 THEN NULL
         WHEN f.shortlist_n = 0 THEN 'locations.shortlist'
         WHEN f.has_primary = 0 THEN 'locations.choose_primary'
         WHEN f.has_backup = 0 THEN 'locations.choose_backup'
         ELSE 'done' END AS locations_action,
    CASE WHEN f.show_partners = 0 THEN NULL
         WHEN f.requests_confirmed > 0 THEN 'done'
         WHEN f.requests_total = 0 THEN 'partners.send_request'
         WHEN f.requests_info > 0 THEN 'partners.answer_partner'
         WHEN f.requests_accepted > 0 THEN 'partners.confirm'
         WHEN f.requests_waiting > 0 THEN 'partners.await_reply'
         ELSE 'partners.send_request' END AS partners_action,
    CASE WHEN f.show_dossier = 0 THEN NULL
         WHEN f.a13_present < f.a13_types THEN 'dossier.add_missing'
         ELSE 'done' END AS dossier_action,
    CASE WHEN f.show_logistics = 0 THEN NULL ELSE 'logistics.phase2' END AS logistics_action,
    f.findings_total - f.findings_reviewed AS content_open_findings,
    CASE WHEN f.show_dossier = 1 THEN (
      SELECT string_agg(dt.doc_code, ',' ORDER BY dt.doc_code)
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

-- public.v_project_readiness: the rows of the projects the caller is a member of. It runs with its owner's
-- rights so members see the M2-M5 results of their own projects (plan Complexity Tracking).
CREATE OR REPLACE VIEW public.v_project_readiness AS
SELECT * FROM app.project_readiness WHERE app.is_project_member(project_id);
REVOKE ALL ON public.v_project_readiness FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_project_readiness TO authenticated;

-- ---- Writes only through the functions below (FR-002, FR-004, SR-271, SR-272) -------------------------
-- The generated grants let any member insert or update these rows directly, which would skip the owner and
-- edit checks; the functions are the only write path.
REVOKE INSERT, UPDATE ON public.project, public.project_member, public.project_province FROM authenticated;

-- The caller's permission on a project: owner, edit, view, or NULL when not an accepted member.
CREATE OR REPLACE FUNCTION app.project_permission(p_project_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT pm.permission FROM public.project_member pm
   WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid() AND pm.invite_status = 'accepted'
     AND app.current_role() <> 'guest'
   LIMIT 1
$$;
REVOKE ALL ON FUNCTION app.project_permission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app.project_permission(uuid) TO authenticated;

-- FR-001: create a project; the creator becomes its owner in the same transaction (D2).
CREATE OR REPLACE FUNCTION public.app_create_project(
  p_project_name text, p_format text, p_segment text,
  p_shoot_date date DEFAULT NULL, p_shoot_days_vn integer DEFAULT NULL, p_crew_size_band text DEFAULT NULL,
  p_provinces integer[] DEFAULT NULL, p_logline text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_org uuid;
  v_email text;
  v_project uuid := gen_random_uuid();
BEGIN
  IF app.current_role() = 'guest' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT pr.producer_org_id, ua.email INTO v_org, v_email
    FROM public.user_account ua LEFT JOIN public.profile pr ON pr.user_id = ua.user_id
   WHERE ua.user_id = auth.uid();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'NO_ORGANISATION';
  END IF;
  IF EXISTS (SELECT 1 FROM public.project p WHERE p.producer_org_id = v_org AND p.project_name = btrim(p_project_name)) THEN
    RAISE EXCEPTION 'NAME_TAKEN';
  END IF;

  INSERT INTO public.project (project_id, producer_org_id, project_name, format, segment, shoot_date, buffer_days,
                              shoot_days_vn, crew_size_band, logline, stage, updated_at)
  VALUES (v_project, v_org, btrim(p_project_name), p_format, p_segment, p_shoot_date, 7,
          p_shoot_days_vn, p_crew_size_band, p_logline, 'draft', now());
  INSERT INTO public.project_member (member_id, project_id, user_id, invitee_email, permission, invite_status)
  VALUES (gen_random_uuid(), v_project, auth.uid(), v_email, 'owner', 'accepted');
  INSERT INTO public.project_province (project_id, province_id)
  SELECT v_project, x FROM unnest(COALESCE(p_provinces, ARRAY[]::integer[])) AS x;
  RETURN v_project;
END;
$$;

-- FR-002: owner or edit change the details and the stage (draft / preparing); never an archived project.
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
         updated_at = now()
   WHERE p.project_id = p_project_id
  RETURNING p.updated_at INTO v_updated;
  RETURN jsonb_build_object('project_id', p_project_id, 'updated_at', v_updated);
END;
$$;

-- BR-005: archive, never delete; documents, requests, members and notices stay.
CREATE OR REPLACE FUNCTION public.app_archive_project(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_permission text := app.project_permission(p_project_id);
BEGIN
  IF v_permission IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF v_permission NOT IN ('owner', 'edit') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF (SELECT p.stage FROM public.project p WHERE p.project_id = p_project_id) = 'archived' THEN
    RAISE EXCEPTION 'ARCHIVED';
  END IF;
  UPDATE public.project SET stage = 'archived', updated_at = now() WHERE project_id = p_project_id;
  RETURN jsonb_build_object('project_id', p_project_id, 'stage', 'archived');
END;
$$;

-- FR-004, D3: the owner invites by email with view or edit; the email itself is queued by the API.
CREATE OR REPLACE FUNCTION public.app_invite_member(p_project_id uuid, p_email text, p_permission text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_permission text := app.project_permission(p_project_id);
  v_member uuid := gen_random_uuid();
BEGIN
  IF v_permission IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF v_permission <> 'owner' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF (SELECT p.stage FROM public.project p WHERE p.project_id = p_project_id) = 'archived' THEN
    RAISE EXCEPTION 'ARCHIVED';
  END IF;
  IF p_permission NOT IN ('view', 'edit') THEN
    RAISE EXCEPTION 'INVALID_PERMISSION';
  END IF;
  IF EXISTS (SELECT 1 FROM public.project_member pm
              WHERE pm.project_id = p_project_id AND lower(pm.invitee_email) = lower(btrim(p_email))) THEN
    RAISE EXCEPTION 'ALREADY_INVITED';
  END IF;
  INSERT INTO public.project_member (member_id, project_id, user_id, invitee_email, permission, invite_status)
  VALUES (v_member, p_project_id, NULL, lower(btrim(p_email)), p_permission, 'pending');
  RETURN v_member;
END;
$$;

-- D3: the signed-in user whose account email is the invited one accepts.
CREATE OR REPLACE FUNCTION public.app_accept_invitation(p_member_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_project uuid;
BEGIN
  IF app.current_role() = 'guest' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT pm.project_id INTO v_project FROM public.project_member pm
   WHERE pm.member_id = p_member_id AND pm.invite_status = 'pending'
     AND lower(pm.invitee_email) = (SELECT lower(ua.email) FROM public.user_account ua WHERE ua.user_id = auth.uid());
  IF v_project IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF (SELECT p.stage FROM public.project p WHERE p.project_id = v_project) = 'archived' THEN
    RAISE EXCEPTION 'ARCHIVED';
  END IF;
  UPDATE public.project_member SET user_id = auth.uid(), invite_status = 'accepted' WHERE member_id = p_member_id;
  RETURN v_project;
END;
$$;

-- ---- FR-008: one snapshot per non-archived project per date (System) ----------------------------------
CREATE OR REPLACE FUNCTION public.app_snapshot_readiness(p_date date)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.readiness_snapshot (snapshot_id, project_id, snapshot_date, readiness_total)
  SELECT gen_random_uuid(), r.project_id, p_date, r.readiness_total
    FROM app.project_readiness r
    JOIN public.project p ON p.project_id = r.project_id
   WHERE COALESCE(p.stage, '') <> 'archived'
     AND NOT EXISTS (SELECT 1 FROM public.readiness_snapshot s WHERE s.project_id = r.project_id AND s.snapshot_date = p_date);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.app_create_project(text, text, text, date, integer, text, integer[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_update_project(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_archive_project(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_invite_member(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_accept_invitation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_snapshot_readiness(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_create_project(text, text, text, date, integer, text, integer[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_update_project(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_archive_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_invite_member(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_accept_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_snapshot_readiness(date) TO service_role;

-- 00:05 Vietnam time (17:05 UTC), only where the pg_cron extension is enabled (Dashboard > Database >
-- Extensions); otherwise run npm run snapshot (scripts/snapshot-readiness.mjs).
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('m0-readiness-snapshot', '5 17 * * *',
      'SELECT public.app_snapshot_readiness((now() AT TIME ZONE ''Asia/Ho_Chi_Minh'')::date)');
  END IF;
END
$cron$;
