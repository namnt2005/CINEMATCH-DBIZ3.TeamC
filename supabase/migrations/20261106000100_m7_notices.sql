-- M7 provincial notices and consultation requests (specs/006-m7-support data-model §2–§5, research R1–R9).
-- New databases already get the columns and the member policy from 20261101000100_schema.sql and
-- 20261101000300_grants_rls.sql (regenerated from data/schema); this file brings databases pushed before
-- 06/11/2026 to the same shape and adds the write functions. The system never sends a notice (M7 BR-001):
-- nothing here writes an email or calls out of the database; members' notifications are written by the API.

-- ---- Columns and constraints (D1, D2; research Open question 5) -------------------------------------
ALTER TABLE public.province_notice
  ADD COLUMN IF NOT EXISTS review_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS review_note TEXT,
  ADD COLUMN IF NOT EXISTS recipient VARCHAR(20),
  ADD COLUMN IF NOT EXISTS response_recorded_by UUID REFERENCES public.user_account (user_id);
ALTER TABLE public.province_notice ALTER COLUMN authority_email DROP NOT NULL;
ALTER TABLE public.province_notice DROP CONSTRAINT IF EXISTS ck_province_notice_delivery_status;
ALTER TABLE public.province_notice
  ADD CONSTRAINT ck_province_notice_delivery_status CHECK (delivery_status IN ('queued', 'downloaded', 'sent', 'bounced'));
ALTER TABLE public.province_notice DROP CONSTRAINT IF EXISTS ck_province_notice_review_status;
ALTER TABLE public.province_notice
  ADD CONSTRAINT ck_province_notice_review_status CHECK (review_status IN ('draft', 'submitted', 'changes_requested', 'approved'));
ALTER TABLE public.province_notice DROP CONSTRAINT IF EXISTS ck_province_notice_recipient;
ALTER TABLE public.province_notice
  ADD CONSTRAINT ck_province_notice_recipient CHECK (recipient IN ('peoples_committee', 'culture_department'));
ALTER TABLE public.consultation_booking
  ADD COLUMN IF NOT EXISTS preferred_times JSONB;

-- ---- Writes only through the functions below; members read their own requests (R9) -----------------
REVOKE INSERT ON public.location_interest, public.consultation_booking FROM authenticated;
DROP POLICY IF EXISTS rls_consultation_booking_select_member ON public.consultation_booking;
CREATE POLICY rls_consultation_booking_select_member ON public.consultation_booking FOR SELECT TO authenticated
  USING (member_id = auth.uid());

-- ---- The project summary, from database data only (FR-002, R3; twin: lib/notices/summary.js) ---------
CREATE OR REPLACE FUNCTION app.notice_summary(p_project_id uuid, p_province_id integer)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  WITH p AS (SELECT * FROM public.project WHERE project_id = p_project_id),
  pv AS (SELECT name FROM public.province WHERE province_id = p_province_id),
  loc AS (SELECT DISTINCT l.location_id, l.name_vi, l.name_en FROM public.location_interest i
            JOIN public.location l ON l.location_id = i.location_id
           WHERE i.project_id = p_project_id AND l.province_id = p_province_id),
  partner AS (SELECT string_agg(x.org_name, ', ' ORDER BY x.org_name COLLATE "C") AS names
                FROM (SELECT DISTINCT o.org_name FROM public.collab_request c JOIN public.organisation o ON o.org_id = c.org_id
                       WHERE c.project_id = p_project_id AND c.status = 'confirmed') x)
  SELECT
    p.project_name || ' — ' || CASE p.format WHEN 'feature' THEN 'Phim truyện' WHEN 'documentary' THEN 'Phim tài liệu'
      WHEN 'commercial' THEN 'Quảng cáo' WHEN 'tv' THEN 'Chương trình truyền hình' WHEN 'music_video' THEN 'Video ca nhạc' ELSE p.format END
    || '; ngày quay đầu tiên ' || COALESCE(to_char(p.shoot_date, 'DD/MM/YYYY'), 'chưa đặt')
    || '; ' || CASE WHEN p.shoot_days_vn IS NULL THEN 'chưa có số ngày quay' ELSE p.shoot_days_vn::text || ' ngày quay tại Việt Nam' END
    || '; quy mô đoàn ' || COALESCE(CASE p.crew_size_band WHEN 'u15' THEN 'dưới 15 người' WHEN '15_50' THEN '15–50 người' WHEN 'o50' THEN 'trên 50 người' END, 'chưa có')
    || '; bối cảnh tại ' || COALESCE(pv.name, '') || ': ' || COALESCE((SELECT string_agg(name_vi COLLATE "C", ', ' ORDER BY name_vi COLLATE "C") FROM loc), '')
    || '; ' || COALESCE('đối tác Việt Nam: ' || partner.names, 'chưa có đối tác Việt Nam được xác nhận') || '.'
    || E'\n'
    || p.project_name || ' — ' || CASE p.format WHEN 'feature' THEN 'Feature film' WHEN 'documentary' THEN 'Documentary'
      WHEN 'commercial' THEN 'Commercial' WHEN 'tv' THEN 'TV programme' WHEN 'music_video' THEN 'Music video' ELSE p.format END
    || '; first shooting day ' || COALESCE(to_char(p.shoot_date, 'DD/MM/YYYY'), 'not set')
    || '; ' || CASE WHEN p.shoot_days_vn IS NULL THEN 'shooting days not set' ELSE p.shoot_days_vn::text || ' shooting days in Vietnam' END
    || '; crew ' || COALESCE(CASE p.crew_size_band WHEN 'u15' THEN 'under 15' WHEN '15_50' THEN '15–50' WHEN 'o50' THEN 'over 50' END, 'not set')
    || '; locations in ' || COALESCE(pv.name, '') || ': ' || COALESCE((SELECT string_agg(name_en COLLATE "C", ', ' ORDER BY name_en COLLATE "C") FROM loc), '')
    || '; ' || COALESCE('Vietnamese partner: ' || partner.names, 'no confirmed Vietnamese partner yet') || '.'
  FROM p LEFT JOIN pv ON true CROSS JOIN partner
$$;

-- ---- FR-001, D5: an interest; a draft for a new province, or the location joins the open notice ------
CREATE OR REPLACE FUNCTION public.app_express_interest(p_project_id uuid, p_location_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_permission text := app.project_permission(p_project_id);
  v_province integer;
  v_email text;
  v_open uuid;
  v_open_status text;
  v_interest uuid;
  v_notice uuid;
BEGIN
  IF v_permission IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_permission NOT IN ('owner', 'edit') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF (SELECT p.stage FROM public.project p WHERE p.project_id = p_project_id) = 'archived' THEN RAISE EXCEPTION 'ARCHIVED'; END IF;
  SELECT l.province_id, CASE WHEN a.contact_verified IS TRUE THEN a.contact_email END INTO v_province, v_email
    FROM public.location l LEFT JOIN public.authority_contact a ON a.location_id = l.location_id
   WHERE l.location_id = p_location_id AND l.intake_status = 'published' AND l.published IS TRUE;
  IF v_province IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT n.interest_id, n.delivery_status INTO v_open, v_open_status
    FROM public.province_notice n JOIN public.location_interest i ON i.interest_id = n.interest_id
   WHERE i.project_id = p_project_id AND n.province_id = v_province;
  IF v_open_status = 'downloaded' THEN RAISE EXCEPTION 'ALREADY_SENT'; END IF;
  SELECT i.interest_id INTO v_interest FROM public.location_interest i WHERE i.project_id = p_project_id AND i.location_id = p_location_id;
  IF v_interest IS NULL THEN
    v_interest := gen_random_uuid();
    INSERT INTO public.location_interest (interest_id, project_id, location_id, created_at) VALUES (v_interest, p_project_id, p_location_id, now());
  END IF;
  IF v_open IS NULL THEN
    INSERT INTO public.province_notice (interest_id, province_id, project_summary, authority_email, drafted_at, review_status)
    VALUES (v_interest, v_province, '', v_email, now(), 'draft');
    v_notice := v_interest;
  ELSE
    v_notice := v_open;
  END IF;
  UPDATE public.province_notice SET project_summary = app.notice_summary(p_project_id, v_province) WHERE interest_id = v_notice;
  RETURN jsonb_build_object('interest_id', v_interest, 'notice_id', v_notice, 'created', v_open IS NULL);
END;
$$;

-- ---- R1: draft or changes requested → submitted, with a first shooting day (US-1 Scenario 2) ---------
CREATE OR REPLACE FUNCTION public.app_submit_notice(p_interest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_project uuid;
  v_province integer;
  v_status text;
  v_permission text;
BEGIN
  SELECT i.project_id, n.province_id, n.review_status INTO v_project, v_province, v_status
    FROM public.province_notice n JOIN public.location_interest i ON i.interest_id = n.interest_id WHERE n.interest_id = p_interest_id;
  IF v_project IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  v_permission := app.project_permission(v_project);
  IF v_permission IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_permission NOT IN ('owner', 'edit') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF (SELECT p.stage FROM public.project p WHERE p.project_id = v_project) = 'archived' THEN RAISE EXCEPTION 'ARCHIVED'; END IF;
  IF v_status NOT IN ('draft', 'changes_requested') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  IF (SELECT p.shoot_date FROM public.project p WHERE p.project_id = v_project) IS NULL THEN RAISE EXCEPTION 'SHOOT_DATE_REQUIRED'; END IF;
  UPDATE public.province_notice SET review_status = 'submitted', project_summary = app.notice_summary(v_project, v_province)
   WHERE interest_id = p_interest_id;
  RETURN jsonb_build_object('review_status', 'submitted');
END;
$$;

-- ---- R6: VFDA staff approve or request changes; one audit_log row in the same transaction ------------
CREATE OR REPLACE FUNCTION public.app_review_notice(p_interest_id uuid, p_decision text, p_note text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_status text;
  v_note text := NULLIF(btrim(COALESCE(p_note, '')), '');
BEGIN
  IF NOT app.has_role('vfda_staff') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_decision NOT IN ('approve', 'request_changes') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF p_decision = 'request_changes' AND v_note IS NULL THEN RAISE EXCEPTION 'NOTE_REQUIRED'; END IF;
  IF length(COALESCE(v_note, '')) > 1000 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  SELECT n.review_status INTO v_status FROM public.province_notice n WHERE n.interest_id = p_interest_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_status IS DISTINCT FROM 'submitted' THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  IF p_decision = 'approve' THEN
    UPDATE public.province_notice SET review_status = 'approved', reviewed_by = auth.uid(), review_note = NULL, delivery_status = 'queued'
     WHERE interest_id = p_interest_id;
  ELSE
    UPDATE public.province_notice SET review_status = 'changes_requested', reviewed_by = auth.uid(), review_note = v_note
     WHERE interest_id = p_interest_id;
  END IF;
  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
  VALUES (gen_random_uuid(), CASE WHEN p_decision = 'approve' THEN 'notice.approve' ELSE 'notice.request_changes' END,
          auth.uid(), p_interest_id, now());
  RETURN jsonb_build_object('review_status', CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'changes_requested' END);
END;
$$;

-- ---- D7: owner / edit record the first download with the recipient; later calls change nothing ------
CREATE OR REPLACE FUNCTION public.app_mark_notice_downloaded(p_interest_id uuid, p_recipient text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_project uuid;
  v_status text;
  v_permission text;
  v_out jsonb;
BEGIN
  SELECT i.project_id, n.review_status INTO v_project, v_status
    FROM public.province_notice n JOIN public.location_interest i ON i.interest_id = n.interest_id WHERE n.interest_id = p_interest_id;
  v_permission := app.project_permission(v_project);
  IF v_project IS NULL OR v_permission IS NULL OR v_status IS DISTINCT FROM 'approved' THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_permission NOT IN ('owner', 'edit') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF (SELECT p.stage FROM public.project p WHERE p.project_id = v_project) = 'archived' THEN RAISE EXCEPTION 'ARCHIVED'; END IF;
  IF p_recipient NOT IN ('peoples_committee', 'culture_department') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  UPDATE public.province_notice SET recipient = p_recipient, delivery_status = 'downloaded', sent_at = now()
   WHERE interest_id = p_interest_id AND sent_at IS NULL;
  SELECT jsonb_build_object('delivery_status', n.delivery_status, 'recipient', n.recipient, 'sent_at', n.sent_at) INTO v_out
    FROM public.province_notice n WHERE n.interest_id = p_interest_id;
  RETURN v_out;
END;
$$;

-- ---- FR-003, BR-003, D3: the member (owner / edit) or VFDA staff record the reply ----------------------
CREATE OR REPLACE FUNCTION public.app_record_province_reply(p_interest_id uuid, p_response text, p_note text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_project uuid;
  v_delivery text;
  v_staff boolean := app.has_role('vfda_staff');
  v_permission text;
BEGIN
  SELECT i.project_id, n.delivery_status INTO v_project, v_delivery
    FROM public.province_notice n JOIN public.location_interest i ON i.interest_id = n.interest_id WHERE n.interest_id = p_interest_id;
  IF v_project IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT v_staff THEN
    v_permission := app.project_permission(v_project);
    IF v_permission IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
    IF v_permission NOT IN ('owner', 'edit') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
    IF (SELECT p.stage FROM public.project p WHERE p.project_id = v_project) = 'archived' THEN RAISE EXCEPTION 'ARCHIVED'; END IF;
  END IF;
  IF p_response IS NULL OR p_response NOT IN ('received', 'info_needed', 'cannot_support') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF length(COALESCE(p_note, '')) > 2000 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF v_delivery IS DISTINCT FROM 'downloaded' THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  UPDATE public.province_notice
     SET response = p_response, note = NULLIF(p_note, ''), responded_at = COALESCE(responded_at, now()),
         received_at = COALESCE(received_at, responded_at, now()), response_recorded_by = auth.uid()
   WHERE interest_id = p_interest_id;
  IF v_staff THEN
    INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
    VALUES (gen_random_uuid(), 'notice.reply', auth.uid(), p_interest_id, now());
  END IF;
  RETURN jsonb_build_object('response', p_response, 'recorded_by_staff', v_staff);
END;
$$;

-- ---- FR-005 as reshaped by BR-005: a consultation request (the API sends the email to VFDA) ----------
CREATE OR REPLACE FUNCTION public.app_request_consultation(p_topic text, p_timezone text, p_preferred_times jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_booking uuid := gen_random_uuid();
  v_count integer;
  v_first timestamptz;
BEGIN
  IF app.current_role() = 'guest' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_topic NOT IN ('dossier', 'locations', 'partners', 'provincial_notice', 'general') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF length(p_timezone) > 40 OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names z WHERE z.name = p_timezone) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF jsonb_typeof(p_preferred_times) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  v_count := jsonb_array_length(p_preferred_times);
  IF v_count < 1 OR v_count > 3 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_preferred_times) t(v)
              WHERE v::timestamptz <= now() OR v::timestamptz > now() + interval '180 days') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  IF (SELECT count(DISTINCT v::timestamptz) FROM jsonb_array_elements_text(p_preferred_times) t(v)) <> v_count THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  v_first := (p_preferred_times ->> 0)::timestamptz;
  INSERT INTO public.consultation_booking (booking_id, member_id, topic, preferred_times, slot_start, timezone, officer_id, booking_status)
  VALUES (v_booking, auth.uid(), p_topic, p_preferred_times, v_first, p_timezone, NULL, NULL);
  RETURN v_booking;
END;
$$;

REVOKE ALL ON FUNCTION app.notice_summary(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.app_express_interest(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_submit_notice(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_review_notice(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_mark_notice_downloaded(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_record_province_reply(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_request_consultation(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_express_interest(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_submit_notice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_review_notice(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_mark_notice_downloaded(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_record_province_reply(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_request_consultation(text, text, jsonb) TO authenticated;
