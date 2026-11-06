-- M4 Vietnamese service partners (specs/007-m4-partners data-model §2–§7, research R1–R15).
-- New databases already get the tables, columns and generated policies from 20261101000100_schema.sql and
-- 20261101000300_grants_rls.sql (regenerated from data/schema and tools/rls_policies.py); this file brings
-- databases pushed before 06/11/2026 to the same shape, closes every direct write, and adds the write
-- functions, the triggers of BR-005, BR-007, BR-009, the private bucket and the reminder job.
-- Notifications and emails are written by the API (System actor), as in M7; nothing here calls out.

-- ---- Tables and columns (D1, D2, D6) ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organisation_user (
    org_id UUID NOT NULL REFERENCES public.organisation (org_id),
    user_id UUID NOT NULL REFERENCES public.user_account (user_id),
    added_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT pk_organisation_user PRIMARY KEY (org_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.partner_invitation (
    invitation_id UUID NOT NULL,
    org_id UUID NOT NULL REFERENCES public.organisation (org_id),
    email VARCHAR(254) NOT NULL,
    code_hash CHAR(64) NOT NULL,
    invited_by UUID NOT NULL REFERENCES public.user_account (user_id),
    invited_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES public.user_account (user_id),
    CONSTRAINT pk_partner_invitation PRIMARY KEY (invitation_id),
    CONSTRAINT uq_partner_invitation_code_hash UNIQUE (code_hash),
    CONSTRAINT ck_partner_invitation_expiry CHECK (expires_at > invited_at),
    CONSTRAINT ck_partner_invitation_accepted CHECK ((accepted_at IS NULL) = (accepted_by IS NULL))
);
ALTER TABLE public.verification_request
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
-- Rows loaded before D6 get placeholder times until the next reseed replaces them
UPDATE public.verification_request SET submitted_at = now() - interval '1 day' WHERE submitted_at IS NULL;
UPDATE public.verification_request SET decided_at = now() WHERE decided_at IS NULL AND status IS DISTINCT FROM 'pending';
ALTER TABLE public.verification_request ALTER COLUMN submitted_at SET NOT NULL;
ALTER TABLE public.verification_request DROP CONSTRAINT IF EXISTS ck_verification_request_decided;
ALTER TABLE public.verification_request
  ADD CONSTRAINT ck_verification_request_decided CHECK ((status = 'pending') = (decided_at IS NULL));
ALTER TABLE public.verification_request DROP CONSTRAINT IF EXISTS ck_verification_request_order;
ALTER TABLE public.verification_request
  ADD CONSTRAINT ck_verification_request_order CHECK (decided_at IS NULL OR decided_at > submitted_at);

-- ---- Reads: the generated policies, for databases pushed before 06/11/2026 (R3) ------------------------
ALTER TABLE public.organisation_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invitation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organisation_user, public.partner_invitation FROM anon, authenticated;
GRANT SELECT ON public.organisation_user, public.partner_invitation, public.collab_message TO authenticated;

DROP POLICY IF EXISTS rls_org_private_after_nda ON public.organisation_private_layer;
CREATE POLICY rls_org_private_after_nda ON public.organisation_private_layer FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.collab_request r WHERE r.org_id = organisation_private_layer.org_id AND r.status IN ('accepted', 'confirmed') AND app.is_project_member(r.project_id) AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'producer' AND n.accepted) AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'partner' AND n.accepted)));
DROP POLICY IF EXISTS rls_org_private_own ON public.organisation_private_layer;
CREATE POLICY rls_org_private_own ON public.organisation_private_layer FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organisation_user ou WHERE ou.org_id = organisation_private_layer.org_id AND ou.user_id = auth.uid()) AND app.has_role('partner'));
DROP POLICY IF EXISTS rls_verification_request_select_partner ON public.verification_request;
CREATE POLICY rls_verification_request_select_partner ON public.verification_request FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organisation_user ou WHERE ou.org_id = verification_request.org_id AND ou.user_id = auth.uid()) AND app.has_role('partner'));
DROP POLICY IF EXISTS rls_collab_request_select_partner ON public.collab_request;
CREATE POLICY rls_collab_request_select_partner ON public.collab_request FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organisation_user ou WHERE ou.org_id = collab_request.org_id AND ou.user_id = auth.uid()) AND app.has_role('partner'));
DROP POLICY IF EXISTS rls_collab_message_select_member_partner ON public.collab_message;
CREATE POLICY rls_collab_message_select_member_partner ON public.collab_message FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.collab_request r WHERE r.request_id = collab_message.request_id AND (app.is_project_member(r.project_id) OR (EXISTS (SELECT 1 FROM public.organisation_user ou WHERE ou.org_id = r.org_id AND ou.user_id = auth.uid()) AND app.has_role('partner')))));
DROP POLICY IF EXISTS rls_nda_acceptance_select_partner ON public.nda_acceptance;
CREATE POLICY rls_nda_acceptance_select_partner ON public.nda_acceptance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.collab_request r WHERE r.request_id = nda_acceptance.request_id AND EXISTS (SELECT 1 FROM public.organisation_user ou WHERE ou.org_id = r.org_id AND ou.user_id = auth.uid()) AND app.has_role('partner')));
DROP POLICY IF EXISTS rls_organisation_user_select_signed_in ON public.organisation_user;
CREATE POLICY rls_organisation_user_select_signed_in ON public.organisation_user FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS rls_organisation_user_select_vfda_staff ON public.organisation_user;
CREATE POLICY rls_organisation_user_select_vfda_staff ON public.organisation_user FOR SELECT TO authenticated
  USING (app.has_role('vfda_staff'));
DROP POLICY IF EXISTS rls_partner_invitation_select_vfda_staff ON public.partner_invitation;
CREATE POLICY rls_partner_invitation_select_vfda_staff ON public.partner_invitation FOR SELECT TO authenticated
  USING (app.has_role('vfda_staff'));

-- ---- Writes only through the functions below (R4) ----------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.organisation FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.organisation_member_layer FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.organisation_private_layer FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.verification_request FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.collab_request FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.collab_message FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.nda_acceptance FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.document_access_log FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.organisation_user FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.partner_invitation FROM anon, authenticated;
DROP POLICY IF EXISTS rls_collab_request_insert_member ON public.collab_request;

-- ---- Triggers: final requests, messages, access log (BR-005, BR-009, BR-007) ------------------------
CREATE OR REPLACE FUNCTION app.collab_request_final()
RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF OLD.status IN ('declined', 'withdrawn', 'confirmed') THEN
    RAISE EXCEPTION 'A declined, withdrawn or confirmed request cannot change (M4 BR-005).';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_collab_request_final ON public.collab_request;
CREATE TRIGGER trg_collab_request_final
  BEFORE UPDATE ON public.collab_request
  FOR EACH ROW EXECUTE FUNCTION app.collab_request_final();

CREATE OR REPLACE FUNCTION app.collab_message_no_update()
RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Messages cannot be edited or deleted once sent (M4 BR-009).';
END;
$$;
DROP TRIGGER IF EXISTS trg_collab_message_no_update ON public.collab_message;
CREATE TRIGGER trg_collab_message_no_update
  BEFORE UPDATE OR DELETE ON public.collab_message
  FOR EACH ROW EXECUTE FUNCTION app.collab_message_no_update();

CREATE OR REPLACE FUNCTION app.document_access_log_append_only()
RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Document access-log entries are append-only (M4 BR-007).';
END;
$$;
DROP TRIGGER IF EXISTS trg_document_access_log_append_only ON public.document_access_log;
CREATE TRIGGER trg_document_access_log_append_only
  BEFORE UPDATE OR DELETE ON public.document_access_log
  FOR EACH ROW EXECUTE FUNCTION app.document_access_log_append_only();

-- ---- Helpers ------------------------------------------------------------------------------------------
-- True when the signed-in partner account acts for the organisation (D1).
CREATE OR REPLACE FUNCTION app.is_org_user(p_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT app.current_role() = 'partner'
     AND EXISTS (SELECT 1 FROM public.organisation_user ou WHERE ou.org_id = p_org_id AND ou.user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION app.is_org_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app.is_org_user(uuid) TO authenticated;

-- True when every element of a JSON array is one of the 12 service groups and the array is not empty (BR-002).
CREATE OR REPLACE FUNCTION app.valid_service_groups(p_groups jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT jsonb_typeof(p_groups) = 'array' AND jsonb_array_length(p_groups) > 0
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_groups) g(v)
                      WHERE g.v NOT IN ('full_production', 'permits_paperwork', 'casting', 'crew', 'camera_lighting', 'studios_interiors',
                                        'location_management', 'transport_logistics', 'lodging_catering', 'interpreting', 'insurance_legal', 'post_production'))
     AND (SELECT count(DISTINCT v) FROM jsonb_array_elements_text(p_groups) g(v)) = jsonb_array_length(p_groups)
$$;

-- ---- FR-001: a partner saves its profile; badge, Article 13 flag, status and slug stay VFDA's (SR-326) ---
CREATE OR REPLACE FUNCTION public.app_save_org_profile(p_org_id uuid, p_fields jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organisation o WHERE o.org_id = p_org_id) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT app.is_org_user(p_org_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF (SELECT o.org_status FROM public.organisation o WHERE o.org_id = p_org_id) = 'deactivated' THEN RAISE EXCEPTION 'ORG_DEACTIVATED'; END IF;
  IF p_fields ?| ARRAY['org_id', 'slug', 'verified_at', 'verified_until', 'art13_eligible', 'org_status'] THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF p_fields ? 'service_groups' AND NOT app.valid_service_groups(p_fields -> 'service_groups') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  UPDATE public.organisation o SET
    org_name = COALESCE(p_fields ->> 'org_name', o.org_name),
    legal_form = COALESCE(p_fields ->> 'legal_form', o.legal_form),
    founded_year = CASE WHEN p_fields ? 'founded_year' THEN (p_fields ->> 'founded_year')::integer ELSE o.founded_year END,
    hq_province = CASE WHEN p_fields ? 'hq_province' THEN (p_fields ->> 'hq_province')::integer ELSE o.hq_province END,
    service_groups = COALESCE(p_fields -> 'service_groups', o.service_groups),
    provinces = COALESCE(p_fields -> 'provinces', o.provinces)
   WHERE o.org_id = p_org_id;
  INSERT INTO public.organisation_member_layer (org_id, capability_desc_vi, capability_desc_en, portfolio, intl_project_count, working_languages)
  VALUES (p_org_id, p_fields ->> 'capability_desc_vi', p_fields ->> 'capability_desc_en', p_fields -> 'portfolio',
          COALESCE((p_fields ->> 'intl_project_count')::integer, 0), p_fields -> 'working_languages')
  ON CONFLICT (org_id) DO UPDATE SET
    capability_desc_vi = CASE WHEN p_fields ? 'capability_desc_vi' THEN EXCLUDED.capability_desc_vi ELSE public.organisation_member_layer.capability_desc_vi END,
    capability_desc_en = CASE WHEN p_fields ? 'capability_desc_en' THEN EXCLUDED.capability_desc_en ELSE public.organisation_member_layer.capability_desc_en END,
    portfolio = CASE WHEN p_fields ? 'portfolio' THEN EXCLUDED.portfolio ELSE public.organisation_member_layer.portfolio END,
    intl_project_count = CASE WHEN p_fields ? 'intl_project_count' THEN EXCLUDED.intl_project_count ELSE public.organisation_member_layer.intl_project_count END,
    working_languages = CASE WHEN p_fields ? 'working_languages' THEN EXCLUDED.working_languages ELSE public.organisation_member_layer.working_languages END;
  INSERT INTO public.organisation_private_layer (org_id, rate_card, past_clients, direct_contact)
  VALUES (p_org_id, p_fields -> 'rate_card', p_fields -> 'past_clients', p_fields ->> 'direct_contact')
  ON CONFLICT (org_id) DO UPDATE SET
    rate_card = CASE WHEN p_fields ? 'rate_card' THEN EXCLUDED.rate_card ELSE public.organisation_private_layer.rate_card END,
    past_clients = CASE WHEN p_fields ? 'past_clients' THEN EXCLUDED.past_clients ELSE public.organisation_private_layer.past_clients END,
    direct_contact = CASE WHEN p_fields ? 'direct_contact' THEN EXCLUDED.direct_contact ELSE public.organisation_private_layer.direct_contact END;
  RETURN jsonb_build_object('org_id', p_org_id);
END;
$$;

-- ---- BR-008: deactivate, never delete; open requests closed as withdrawn ----------------------------------
CREATE OR REPLACE FUNCTION public.app_deactivate_org(p_org_id uuid, p_typed_name text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_name text;
  v_ids jsonb;
BEGIN
  SELECT o.org_name INTO v_name FROM public.organisation o WHERE o.org_id = p_org_id;
  IF v_name IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT (app.is_org_user(p_org_id) OR app.has_role('vfda_staff')) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF btrim(COALESCE(p_typed_name, '')) <> btrim(v_name) THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  UPDATE public.organisation SET org_status = 'deactivated' WHERE org_id = p_org_id;
  SELECT COALESCE(jsonb_agg(r.request_id), '[]'::jsonb) INTO v_ids FROM public.collab_request r
   WHERE r.org_id = p_org_id AND r.status IN ('pending', 'under_review', 'info_requested', 'accepted');
  INSERT INTO public.collab_message (message_id, request_id, author_id, created_at, body)
  SELECT gen_random_uuid(), (x.v)::uuid, auth.uid(), now(), 'Tổ chức đã ngừng hoạt động trên CINEMATCH. — The organisation is no longer active on CINEMATCH.'
    FROM jsonb_array_elements_text(v_ids) x(v);
  UPDATE public.collab_request SET status = 'withdrawn' WHERE request_id IN (SELECT (x.v)::uuid FROM jsonb_array_elements_text(v_ids) x(v));
  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
  VALUES (gen_random_uuid(), 'organisation.deactivate', auth.uid(), p_org_id, now());
  RETURN jsonb_build_object('org_status', 'deactivated', 'withdrawn', v_ids);
END;
$$;

-- ---- FR-008: a partner submits its business registration and references (one pending at a time) ----------
CREATE OR REPLACE FUNCTION public.app_submit_verification(p_org_id uuid, p_license_path text, p_references jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_at timestamptz := now();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organisation o WHERE o.org_id = p_org_id) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT app.is_org_user(p_org_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF (SELECT o.org_status FROM public.organisation o WHERE o.org_id = p_org_id) = 'deactivated' THEN RAISE EXCEPTION 'ORG_DEACTIVATED'; END IF;
  IF EXISTS (SELECT 1 FROM public.verification_request v WHERE v.org_id = p_org_id AND v.status = 'pending') THEN RAISE EXCEPTION 'PENDING_EXISTS'; END IF;
  IF p_license_path IS NULL OR p_license_path NOT LIKE p_org_id::text || '/verification/%' OR p_license_path LIKE '%..%' THEN RAISE EXCEPTION 'FILE_INVALID'; END IF;
  IF jsonb_typeof(p_references) IS DISTINCT FROM 'array'
     OR (SELECT count(*) FROM jsonb_array_elements_text(p_references) r(v) WHERE btrim(r.v) <> '') < 2 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR';
  END IF;
  INSERT INTO public.verification_request (request_id, org_id, business_license, reference_projects, status, decided_by, reason, submitted_at, decided_at)
  VALUES (v_id, p_org_id, p_license_path, p_references, 'pending', NULL, NULL, v_at, NULL);
  RETURN jsonb_build_object('verification_request_id', v_id, 'status', 'pending', 'submitted_at', v_at);
END;
$$;

-- ---- FR-010, BR-004: VFDA decides; a badge lasts 12 months from the decision; one audit row ---------------
CREATE OR REPLACE FUNCTION public.app_decide_verification(p_request_id uuid, p_decision text, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_org uuid;
  v_status text;
  v_at timestamptz := now();
  v_until date;
  v_reason text := NULLIF(btrim(COALESCE(p_reason, '')), '');
BEGIN
  IF NOT app.has_role('vfda_staff') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF p_decision = 'rejected' AND (v_reason IS NULL OR length(v_reason) > 1000) THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  SELECT v.org_id, v.status INTO v_org, v_status FROM public.verification_request v WHERE v.request_id = p_request_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_status IS DISTINCT FROM 'pending' THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  UPDATE public.verification_request
     SET status = p_decision, decided_by = auth.uid(), decided_at = v_at, reason = CASE WHEN p_decision = 'rejected' THEN v_reason END
   WHERE request_id = p_request_id;
  IF p_decision = 'approved' THEN
    v_until := ((v_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + interval '12 months')::date;
    UPDATE public.organisation SET verified_at = v_at, verified_until = v_until WHERE org_id = v_org;
  END IF;
  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
  VALUES (gen_random_uuid(), CASE WHEN p_decision = 'approved' THEN 'org.verify.approve' ELSE 'org.verify.reject' END, auth.uid(), p_request_id, v_at);
  RETURN jsonb_build_object('org_id', v_org, 'status', p_decision, 'decided_at', v_at, 'verified_at', CASE WHEN v_until IS NOT NULL THEN v_at END, 'verified_until', v_until);
END;
$$;

-- ---- Q3: the Article 13 flag, only by VFDA and only after the film-service business line is confirmed -----
CREATE OR REPLACE FUNCTION public.app_set_art13(p_org_id uuid, p_on boolean, p_business_line_confirmed boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT app.has_role('vfda_staff') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organisation o WHERE o.org_id = p_org_id) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF p_on IS NULL THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF p_on AND NOT COALESCE(p_business_line_confirmed, false) THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  UPDATE public.organisation SET art13_eligible = p_on WHERE org_id = p_org_id;
  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
  VALUES (gen_random_uuid(), CASE WHEN p_on THEN 'organisation.art13_on' ELSE 'organisation.art13_off' END, auth.uid(), p_org_id, now());
  RETURN jsonb_build_object('org_id', p_org_id, 'art13_eligible', p_on);
END;
$$;

-- ---- FR-011: remind the organisation's users 30 days before the badge ends, once per badge (System) -----
CREATE OR REPLACE FUNCTION public.app_remind_expiring_verifications()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  v_count integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT o.org_id, o.verified_until FROM public.organisation o
     WHERE COALESCE(o.org_status, 'active') = 'active' AND o.verified_until >= v_today AND o.verified_until <= v_today + 30
       AND EXISTS (SELECT 1 FROM public.organisation_user ou WHERE ou.org_id = o.org_id)
       AND NOT EXISTS (SELECT 1 FROM public.notification n JOIN public.organisation_user ou ON ou.user_id = n.recipient_id AND ou.org_id = o.org_id
                        WHERE n.event_type = 'verification.expiring' AND n.payload ->> 'verified_until' = o.verified_until::text)
  LOOP
    INSERT INTO public.notification (notification_id, recipient_id, event_type, payload, created_at, read_at)
    SELECT gen_random_uuid(), ou.user_id, 'verification.expiring',
           jsonb_build_object('verified_until', r.verified_until::text, 'days_left', r.verified_until - v_today), now(), NULL
      FROM public.organisation_user ou WHERE ou.org_id = r.org_id;
    INSERT INTO public.email_delivery (email_delivery_id, notification_id, template_id, recipient_email, variables, delivery_status, provider_message_id)
    SELECT gen_random_uuid(), n.notification_id, 'verification.expiring', u.email, n.payload, 'queued', NULL
      FROM public.notification n JOIN public.user_account u ON u.user_id = n.recipient_id
     WHERE n.event_type = 'verification.expiring' AND n.payload ->> 'verified_until' = r.verified_until::text
       AND n.recipient_id IN (SELECT ou.user_id FROM public.organisation_user ou WHERE ou.org_id = r.org_id)
       AND COALESCE(u.account_status, 'active') = 'active'
       AND NOT EXISTS (SELECT 1 FROM public.email_delivery e WHERE e.notification_id = n.notification_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ---- FR-012: a producer (owner or edit) sends a request tied to a project ------------------------------------
CREATE OR REPLACE FUNCTION public.app_send_collab_request(p_project_id uuid, p_org_id uuid, p_services jsonb, p_note text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_permission text := app.project_permission(p_project_id);
  v_id uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.project p WHERE p.project_id = p_project_id) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF COALESCE(v_permission, '') NOT IN ('owner', 'edit') OR NOT app.has_role('member') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF (SELECT p.stage FROM public.project p WHERE p.project_id = p_project_id) = 'archived' THEN RAISE EXCEPTION 'ARCHIVED'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organisation o WHERE o.org_id = p_org_id) THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF (SELECT o.org_status FROM public.organisation o WHERE o.org_id = p_org_id) = 'deactivated' THEN RAISE EXCEPTION 'ORG_DEACTIVATED'; END IF;
  IF NOT app.valid_service_groups(p_services) OR length(COALESCE(p_note, '')) > 1000 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF EXISTS (SELECT 1 FROM public.collab_request r WHERE r.project_id = p_project_id AND r.org_id = p_org_id
              AND r.status IN ('pending', 'under_review', 'info_requested', 'accepted')) THEN
    RAISE EXCEPTION 'OPEN_REQUEST_EXISTS';
  END IF;
  INSERT INTO public.collab_request (request_id, project_id, org_id, services, note, status, response_note, sent_at, responded_at, confirmed_at)
  VALUES (v_id, p_project_id, p_org_id, p_services, NULLIF(btrim(COALESCE(p_note, '')), ''), 'pending', NULL, now(), NULL, NULL);
  RETURN jsonb_build_object('request_id', v_id, 'status', 'pending', 'step', 1);
END;
$$;

-- ---- FR-014, BR-005: only the partner responds; accepting records its NDA; every note is a message ----------
CREATE OR REPLACE FUNCTION public.app_respond_collab_request(p_request_id uuid, p_decision text, p_note text, p_nda_accepted boolean, p_nda_version text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_org uuid;
  v_status text;
  v_note text := NULLIF(btrim(COALESCE(p_note, '')), '');
BEGIN
  SELECT r.org_id, r.status INTO v_org, v_status FROM public.collab_request r WHERE r.request_id = p_request_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT app.is_org_user(v_org) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_status NOT IN ('pending', 'under_review', 'info_requested') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  IF p_decision NOT IN ('under_review', 'info_requested', 'accepted', 'declined') OR length(COALESCE(v_note, '')) > 2000 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF p_decision = 'accepted' AND (NOT COALESCE(p_nda_accepted, false) OR NULLIF(btrim(COALESCE(p_nda_version, '')), '') IS NULL) THEN RAISE EXCEPTION 'NDA_REQUIRED'; END IF;
  UPDATE public.collab_request
     SET status = p_decision, response_note = COALESCE(v_note, response_note), responded_at = COALESCE(responded_at, now())
   WHERE request_id = p_request_id;
  IF v_note IS NOT NULL THEN
    INSERT INTO public.collab_message (message_id, request_id, author_id, created_at, body) VALUES (gen_random_uuid(), p_request_id, auth.uid(), now(), v_note);
  END IF;
  IF p_decision = 'accepted' THEN
    INSERT INTO public.nda_acceptance (nda_acceptance_id, request_id, party, nda_version, accepted, accepted_at)
    VALUES (gen_random_uuid(), p_request_id, 'partner', p_nda_version, true, now());
  END IF;
  RETURN jsonb_build_object('request_id', p_request_id, 'status', p_decision);
END;
$$;

-- ---- FR-017: the producer accepts the NDA on an accepted request; that opens the private layer (R7) ----------
CREATE OR REPLACE FUNCTION public.app_accept_nda(p_request_id uuid, p_nda_version text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_project uuid;
  v_status text;
BEGIN
  SELECT r.project_id, r.status INTO v_project, v_status FROM public.collab_request r WHERE r.request_id = p_request_id;
  IF v_project IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF COALESCE(app.project_permission(v_project), '') NOT IN ('owner', 'edit') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_status IS DISTINCT FROM 'accepted' THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  IF NULLIF(btrim(COALESCE(p_nda_version, '')), '') IS NULL THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = p_request_id AND n.party = 'producer' AND n.accepted) THEN
    INSERT INTO public.nda_acceptance (nda_acceptance_id, request_id, party, nda_version, accepted, accepted_at)
    VALUES (gen_random_uuid(), p_request_id, 'producer', p_nda_version, true, now());
  END IF;
  RETURN jsonb_build_object('request_id', p_request_id, 'producer', true);
END;
$$;

-- ---- BR-005: only the producer confirms, from accepted and after its own NDA -------------------------------
CREATE OR REPLACE FUNCTION public.app_confirm_collab_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_project uuid;
  v_status text;
  v_at timestamptz := now();
BEGIN
  SELECT r.project_id, r.status INTO v_project, v_status FROM public.collab_request r WHERE r.request_id = p_request_id;
  IF v_project IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF COALESCE(app.project_permission(v_project), '') NOT IN ('owner', 'edit') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_status IS DISTINCT FROM 'accepted' THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = p_request_id AND n.party = 'producer' AND n.accepted) THEN
    RAISE EXCEPTION 'NDA_REQUIRED';
  END IF;
  UPDATE public.collab_request SET status = 'confirmed', confirmed_at = v_at WHERE request_id = p_request_id;
  RETURN jsonb_build_object('request_id', p_request_id, 'status', 'confirmed', 'confirmed_at', v_at);
END;
$$;

-- ---- BR-005: only the producer withdraws an open request ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_withdraw_collab_request(p_request_id uuid, p_note text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_project uuid;
  v_status text;
  v_note text := NULLIF(btrim(COALESCE(p_note, '')), '');
BEGIN
  SELECT r.project_id, r.status INTO v_project, v_status FROM public.collab_request r WHERE r.request_id = p_request_id;
  IF v_project IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF COALESCE(app.project_permission(v_project), '') NOT IN ('owner', 'edit') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_status NOT IN ('pending', 'under_review', 'info_requested', 'accepted') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  IF length(COALESCE(v_note, '')) > 2000 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  UPDATE public.collab_request SET status = 'withdrawn' WHERE request_id = p_request_id;
  IF v_note IS NOT NULL THEN
    INSERT INTO public.collab_message (message_id, request_id, author_id, created_at, body) VALUES (gen_random_uuid(), p_request_id, auth.uid(), now(), v_note);
  END IF;
  RETURN jsonb_build_object('request_id', p_request_id, 'status', 'withdrawn');
END;
$$;

-- ---- BR-009: a message by either side, never edited ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_post_collab_message(p_request_id uuid, p_body text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_project uuid;
  v_org uuid;
  v_id uuid := gen_random_uuid();
  v_at timestamptz := now();
  v_body text := btrim(COALESCE(p_body, ''));
BEGIN
  SELECT r.project_id, r.org_id INTO v_project, v_org FROM public.collab_request r WHERE r.request_id = p_request_id;
  IF v_project IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT (COALESCE(app.project_permission(v_project), '') IN ('owner', 'edit') OR app.is_org_user(v_org)) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF length(v_body) < 1 OR length(v_body) > 2000 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  INSERT INTO public.collab_message (message_id, request_id, author_id, created_at, body) VALUES (v_id, p_request_id, auth.uid(), v_at, v_body);
  RETURN jsonb_build_object('message_id', v_id, 'created_at', v_at);
END;
$$;

-- ---- BR-003, SYS BR-002 (06/11/2026): vfda_staff or admin invite; only a SHA-256 of the code is kept --------
CREATE OR REPLACE FUNCTION public.app_create_partner_invitation(p_org_id uuid, p_org jsonb, p_email text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_org uuid := p_org_id;
  v_email text := lower(btrim(COALESCE(p_email, '')));
  v_secret text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_id uuid := gen_random_uuid();
  v_at timestamptz := now();
BEGIN
  IF NOT app.has_role('vfda_staff') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(v_email) > 254 THEN RAISE EXCEPTION 'VALIDATION_ERROR'; END IF;
  IF v_org IS NULL THEN
    IF p_org IS NULL OR NULLIF(btrim(COALESCE(p_org ->> 'org_name', '')), '') IS NULL OR NULLIF(btrim(COALESCE(p_org ->> 'legal_form', '')), '') IS NULL
       OR NULLIF(btrim(COALESCE(p_org ->> 'slug', '')), '') IS NULL OR NOT app.valid_service_groups(p_org -> 'service_groups')
       OR jsonb_typeof(p_org -> 'provinces') IS DISTINCT FROM 'array' OR jsonb_array_length(p_org -> 'provinces') = 0 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR';
    END IF;
    v_org := gen_random_uuid();
    INSERT INTO public.organisation (org_id, slug, org_name, legal_form, founded_year, hq_province, service_groups, provinces, verified_at, verified_until, art13_eligible, org_status)
    VALUES (v_org, p_org ->> 'slug', btrim(p_org ->> 'org_name'), btrim(p_org ->> 'legal_form'), NULL, (p_org ->> 'hq_province')::integer,
            p_org -> 'service_groups', p_org -> 'provinces', NULL, NULL, false, 'active');
  ELSIF NOT EXISTS (SELECT 1 FROM public.organisation o WHERE o.org_id = v_org) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF EXISTS (SELECT 1 FROM public.partner_invitation i WHERE i.org_id = v_org AND i.email = v_email AND i.accepted_at IS NULL AND i.expires_at > v_at) THEN
    RAISE EXCEPTION 'INVITATION_OPEN';
  END IF;
  INSERT INTO public.partner_invitation (invitation_id, org_id, email, code_hash, invited_by, invited_at, expires_at, accepted_at, accepted_by)
  VALUES (v_id, v_org, v_email, encode(sha256(convert_to(v_secret, 'UTF8')), 'hex'), auth.uid(), v_at, v_at + interval '7 days', NULL, NULL);
  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
  VALUES (gen_random_uuid(), 'partner.invite', auth.uid(), v_id, v_at);
  -- The one-time secret goes back to the API once, to be emailed; it is stored nowhere
  RETURN jsonb_build_object('invitation_id', v_id, 'org_id', v_org, 'expires_at', v_at + interval '7 days', 'secret', v_secret);
END;
$$;

CREATE OR REPLACE FUNCTION public.app_accept_partner_invitation(p_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_inv record;
  v_role text;
  v_email text;
BEGIN
  IF v_user IS NULL OR app.current_role() = 'guest' THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  SELECT * INTO v_inv FROM public.partner_invitation i WHERE i.code_hash = encode(sha256(convert_to(COALESCE(p_code, ''), 'UTF8')), 'hex');
  IF v_inv.invitation_id IS NULL OR v_inv.accepted_at IS NOT NULL OR v_inv.expires_at <= now() THEN RAISE EXCEPTION 'INVITATION_INVALID'; END IF;
  SELECT u.role, lower(u.email) INTO v_role, v_email FROM public.user_account u WHERE u.user_id = v_user;
  IF v_email IS DISTINCT FROM v_inv.email THEN RAISE EXCEPTION 'EMAIL_MISMATCH'; END IF;
  IF v_role NOT IN ('member', 'partner') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF EXISTS (SELECT 1 FROM public.project_member pm WHERE pm.user_id = v_user) THEN RAISE EXCEPTION 'ALREADY_MEMBER_OF_PROJECT'; END IF;
  UPDATE public.user_account SET role = 'partner' WHERE user_id = v_user;
  INSERT INTO public.organisation_user (org_id, user_id, added_at) VALUES (v_inv.org_id, v_user, now()) ON CONFLICT (org_id, user_id) DO NOTHING;
  UPDATE public.partner_invitation SET accepted_at = now(), accepted_by = v_user WHERE invitation_id = v_inv.invitation_id;
  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
  VALUES (gen_random_uuid(), 'role.grant', v_inv.invited_by, v_user, now());
  RETURN jsonb_build_object('role', 'partner', 'org_id', v_inv.org_id,
                            'org_slug', (SELECT o.slug FROM public.organisation o WHERE o.org_id = v_inv.org_id));
END;
$$;

-- ---- SYS BR-002 as changed 06/11/2026: an admin grants every role except partner, which comes only from an
-- accepted invitation (analysis G1). Same signature and grants as 20261101000400_rules.sql.
CREATE OR REPLACE FUNCTION public.app_grant_role(p_user_id uuid, p_role text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT app.has_role('admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_role = 'partner' THEN
    RAISE EXCEPTION 'ROLE_BY_INVITATION_ONLY';
  END IF;
  IF p_role NOT IN ('member', 'vfda_staff', 'vfda_legal', 'admin') THEN
    RAISE EXCEPTION 'INVALID_ROLE';
  END IF;
  UPDATE public.user_account SET role = p_role WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
  VALUES (gen_random_uuid(), 'role.grant', auth.uid(), p_user_id, now());
  RETURN jsonb_build_object('user_id', p_user_id, 'role', p_role);
END;
$$;

-- ---- FR-018 (D4): one access-log row per document view; the viewer is built with M5 ------------------------
CREATE OR REPLACE FUNCTION public.app_log_document_view(p_document_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_project uuid;
  v_id uuid := gen_random_uuid();
  v_at timestamptz := now();
BEGIN
  IF auth.uid() IS NULL OR app.current_role() = 'guest' THEN RAISE EXCEPTION 'UNAUTHENTICATED'; END IF;
  SELECT d.project_id INTO v_project FROM public.document d WHERE d.document_id = p_document_id;
  IF v_project IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT (app.is_project_member(v_project) OR EXISTS (
        SELECT 1 FROM public.collab_request r WHERE r.project_id = v_project AND r.status IN ('accepted', 'confirmed') AND app.is_org_user(r.org_id)
           AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'producer' AND n.accepted)
           AND EXISTS (SELECT 1 FROM public.nda_acceptance n WHERE n.request_id = r.request_id AND n.party = 'partner' AND n.accepted))) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  INSERT INTO public.document_access_log (access_log_id, document_id, viewer_id, viewed_at) VALUES (v_id, p_document_id, auth.uid(), v_at);
  RETURN jsonb_build_object('access_log_id', v_id, 'viewed_at', v_at);
END;
$$;

-- ---- Grants -----------------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.app_save_org_profile(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_deactivate_org(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_submit_verification(uuid, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_decide_verification(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_set_art13(uuid, boolean, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_send_collab_request(uuid, uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_respond_collab_request(uuid, text, text, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_accept_nda(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_confirm_collab_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_withdraw_collab_request(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_post_collab_message(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_create_partner_invitation(uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_accept_partner_invitation(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_log_document_view(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_remind_expiring_verifications() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app.valid_service_groups(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app.valid_service_groups(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_save_org_profile(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_deactivate_org(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_submit_verification(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_decide_verification(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_set_art13(uuid, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_send_collab_request(uuid, uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_respond_collab_request(uuid, text, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_accept_nda(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_confirm_collab_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_withdraw_collab_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_post_collab_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_create_partner_invitation(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_accept_partner_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_log_document_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_remind_expiring_verifications() TO service_role;

-- ---- R10: private bucket for business registration PDFs; no object policy (signed URLs from the server) ----
DO $storage$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('org-documents', 'org-documents', false, 26214400, '{application/pdf}')
    ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 26214400, allowed_mime_types = '{application/pdf}';
  END IF;
END
$storage$;

-- ---- FR-011: daily at 08:00 Vietnam time (01:00 UTC), only where pg_cron is enabled; otherwise run
-- npm run verification:remind (scripts/remind-verification.mjs).
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('m4-verification-reminder', '0 1 * * *', 'SELECT public.app_remind_expiring_verifications()');
  END IF;
END
$cron$;
