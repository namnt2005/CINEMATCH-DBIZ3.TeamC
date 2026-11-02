-- Database rules and the write functions of SC-35 and SYS (specs/003-sys-core research R4, R12; data-model §5).
-- PostgreSQL versions of lib/db/local-triggers.sql, plus functions that change data and write their audit row
-- in the same transaction (M10 BR-005). Each checks the caller's role first (app.has_role or auth.uid()).

-- ---- M3 BR-004: a location becomes published only with a verified authority contact ---------------------
CREATE OR REPLACE FUNCTION app.location_publish_needs_contact()
RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF (NEW.intake_status = 'published' OR NEW.published IS TRUE)
     AND (TG_OP = 'INSERT' OR NOT (OLD.intake_status = 'published' AND OLD.published IS TRUE))
     AND NOT EXISTS (SELECT 1 FROM public.authority_contact c
                      WHERE c.location_id = NEW.location_id AND c.contact_verified IS TRUE) THEN
    RAISE EXCEPTION 'Authority contact not verified (M3 BR-004).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_location_publish_needs_contact ON public.location;
CREATE TRIGGER trg_location_publish_needs_contact
  BEFORE INSERT OR UPDATE OF intake_status, published ON public.location
  FOR EACH ROW EXECUTE FUNCTION app.location_publish_needs_contact();

-- ---- M10 BR-005: audit records are append-only ------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.audit_log_append_only()
RETURNS trigger
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Audit records are append-only (M10 BR-005).';
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_append_only ON public.audit_log;
CREATE TRIGGER trg_audit_log_append_only
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION app.audit_log_append_only();

-- ---- SC-35: create or edit the 20 fields (FR-002, BR-010) -------------------------------------------------
-- rpc: location insert app_admin_save_location
-- rpc: location update app_admin_save_location
CREATE OR REPLACE FUNCTION public.app_admin_save_location(p_location_id uuid, p_slug text, p_fields jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT app.has_role('vfda_staff') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_location_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.location WHERE slug = p_slug) THEN
      RAISE EXCEPTION 'SLUG_TAKEN';
    END IF;
    v_id := gen_random_uuid();
    INSERT INTO public.location (location_id, slug, name_vi, name_en, province_id, district, lat, lng, airport_km, scene_types, desc_vi, desc_en, crew_capacity, lodging_20km, grid_power, truck_access, months_to_avoid, permit_complexity, restriction_note, availability, night_shooting_allowed, rainy_months, intake_status, published, blocked_reason)
    VALUES (
      v_id, p_slug,
      p_fields ->> 'name_vi',
      p_fields ->> 'name_en',
      (p_fields ->> 'province_id')::integer,
      p_fields ->> 'district',
      (p_fields ->> 'lat')::numeric,
      (p_fields ->> 'lng')::numeric,
      (p_fields ->> 'airport_km')::integer,
      NULLIF(p_fields -> 'scene_types', 'null'::jsonb),
      p_fields ->> 'desc_vi',
      p_fields ->> 'desc_en',
      p_fields ->> 'crew_capacity',
      (p_fields ->> 'lodging_20km')::boolean,
      (p_fields ->> 'grid_power')::boolean,
      (p_fields ->> 'truck_access')::boolean,
      NULLIF(p_fields -> 'months_to_avoid', 'null'::jsonb),
      p_fields ->> 'permit_complexity',
      p_fields ->> 'restriction_note',
      p_fields ->> 'availability',
      p_fields ->> 'night_shooting_allowed',
      NULLIF(p_fields -> 'rainy_months', 'null'::jsonb),
      'awaiting_contact', false, 'Authority contact not verified (M3 BR-004).');
    INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
    VALUES (gen_random_uuid(), 'location.create', auth.uid(), v_id, now());
    RETURN jsonb_build_object('location_id', v_id);
  END IF;

  UPDATE public.location
     SET name_vi = CASE WHEN p_fields ? 'name_vi' THEN p_fields ->> 'name_vi' ELSE name_vi END,
           name_en = CASE WHEN p_fields ? 'name_en' THEN p_fields ->> 'name_en' ELSE name_en END,
           province_id = CASE WHEN p_fields ? 'province_id' THEN (p_fields ->> 'province_id')::integer ELSE province_id END,
           district = CASE WHEN p_fields ? 'district' THEN p_fields ->> 'district' ELSE district END,
           lat = CASE WHEN p_fields ? 'lat' THEN (p_fields ->> 'lat')::numeric ELSE lat END,
           lng = CASE WHEN p_fields ? 'lng' THEN (p_fields ->> 'lng')::numeric ELSE lng END,
           airport_km = CASE WHEN p_fields ? 'airport_km' THEN (p_fields ->> 'airport_km')::integer ELSE airport_km END,
           scene_types = CASE WHEN p_fields ? 'scene_types' THEN NULLIF(p_fields -> 'scene_types', 'null'::jsonb) ELSE scene_types END,
           desc_vi = CASE WHEN p_fields ? 'desc_vi' THEN p_fields ->> 'desc_vi' ELSE desc_vi END,
           desc_en = CASE WHEN p_fields ? 'desc_en' THEN p_fields ->> 'desc_en' ELSE desc_en END,
           crew_capacity = CASE WHEN p_fields ? 'crew_capacity' THEN p_fields ->> 'crew_capacity' ELSE crew_capacity END,
           lodging_20km = CASE WHEN p_fields ? 'lodging_20km' THEN (p_fields ->> 'lodging_20km')::boolean ELSE lodging_20km END,
           grid_power = CASE WHEN p_fields ? 'grid_power' THEN (p_fields ->> 'grid_power')::boolean ELSE grid_power END,
           truck_access = CASE WHEN p_fields ? 'truck_access' THEN (p_fields ->> 'truck_access')::boolean ELSE truck_access END,
           months_to_avoid = CASE WHEN p_fields ? 'months_to_avoid' THEN NULLIF(p_fields -> 'months_to_avoid', 'null'::jsonb) ELSE months_to_avoid END,
           permit_complexity = CASE WHEN p_fields ? 'permit_complexity' THEN p_fields ->> 'permit_complexity' ELSE permit_complexity END,
           restriction_note = CASE WHEN p_fields ? 'restriction_note' THEN p_fields ->> 'restriction_note' ELSE restriction_note END,
           availability = CASE WHEN p_fields ? 'availability' THEN p_fields ->> 'availability' ELSE availability END,
           night_shooting_allowed = CASE WHEN p_fields ? 'night_shooting_allowed' THEN p_fields ->> 'night_shooting_allowed' ELSE night_shooting_allowed END,
           rainy_months = CASE WHEN p_fields ? 'rainy_months' THEN NULLIF(p_fields -> 'rainy_months', 'null'::jsonb) ELSE rainy_months END
   WHERE location_id = p_location_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF p_fields ? 'availability' THEN
    INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
    VALUES (gen_random_uuid(), 'location.availability', auth.uid(), p_location_id, now());
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_fields) k WHERE k <> 'availability') THEN
    INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
    VALUES (gen_random_uuid(), 'location.update', auth.uid(), p_location_id, now());
  END IF;
  RETURN jsonb_build_object('location_id', p_location_id);
END;
$$;

-- ---- SC-35: record the authority contact; any change clears the verification (FR-004, SR-314, D4) --------
-- rpc: authority_contact insert app_admin_save_contact
-- rpc: authority_contact update app_admin_save_contact
CREATE OR REPLACE FUNCTION public.app_admin_save_contact(p_location_id uuid, p_contact jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT app.has_role('vfda_staff') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.location WHERE location_id = p_location_id) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  INSERT INTO public.authority_contact (location_id, authority_name, contact_name, contact_phone, contact_email,
                                        verified_by, verified_at, contact_verified)
  VALUES (p_location_id, p_contact ->> 'authority_name', p_contact ->> 'contact_name', p_contact ->> 'contact_phone',
          NULLIF(p_contact ->> 'contact_email', ''), auth.uid(), NULL, false)
  ON CONFLICT (location_id) DO UPDATE SET
    authority_name = EXCLUDED.authority_name, contact_name = EXCLUDED.contact_name,
    contact_phone = EXCLUDED.contact_phone, contact_email = EXCLUDED.contact_email,
    verified_by = EXCLUDED.verified_by, verified_at = NULL, contact_verified = false;

  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
  VALUES (gen_random_uuid(), 'location.update', auth.uid(), p_location_id, now());
  RETURN jsonb_build_object('location_id', p_location_id);
END;
$$;

-- ---- SC-35: mark the contact as verified (FR-004) ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_admin_verify_contact(p_location_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT app.has_role('vfda_staff') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.authority_contact WHERE location_id = p_location_id) THEN
    RAISE EXCEPTION 'NO_CONTACT';
  END IF;

  UPDATE public.authority_contact
     SET contact_verified = true, verified_by = auth.uid(), verified_at = now()
   WHERE location_id = p_location_id;
  UPDATE public.location SET blocked_reason = NULL
   WHERE location_id = p_location_id AND blocked_reason = 'Authority contact not verified (M3 BR-004).';

  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
  VALUES (gen_random_uuid(), 'location.contact_verify', auth.uid(), p_location_id, now());
  RETURN jsonb_build_object('location_id', p_location_id);
END;
$$;

-- ---- SC-35: publish, or publish again (FR-005, BR-004) ----------------------------------------------------
-- A refusal by trg_location_publish_needs_contact keeps only the reason shown next to Publish (no audit row).
CREATE OR REPLACE FUNCTION public.app_admin_publish_location(p_location_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT app.has_role('vfda_staff') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT intake_status INTO v_status FROM public.location WHERE location_id = p_location_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF v_status = 'published' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: This location is already published.';
  END IF;

  BEGIN
    UPDATE public.location SET intake_status = 'published', published = true, blocked_reason = NULL
     WHERE location_id = p_location_id;
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%BR-004%' THEN
      UPDATE public.location SET blocked_reason = 'Authority contact not verified (M3 BR-004).' WHERE location_id = p_location_id;
      RETURN jsonb_build_object('error', 'Authority contact not verified (M3 BR-004).');
    END IF;
    RAISE;
  END;

  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
  VALUES (gen_random_uuid(), 'location.publish', auth.uid(), p_location_id, now());
  RETURN jsonb_build_object('location_id', p_location_id);
END;
$$;

-- ---- SC-35: unpublish; the location is kept, never deleted (BR-008) ---------------------------------------
CREATE OR REPLACE FUNCTION public.app_admin_unpublish_location(p_location_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT app.has_role('vfda_staff') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT intake_status INTO v_status FROM public.location WHERE location_id = p_location_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF v_status <> 'published' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Only a published location can be unpublished.';
  END IF;

  UPDATE public.location SET intake_status = 'unpublished', published = false, blocked_reason = NULLIF(p_reason, '')
   WHERE location_id = p_location_id;
  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
  VALUES (gen_random_uuid(), 'location.unpublish', auth.uid(), p_location_id, now());
  RETURN jsonb_build_object('location_id', p_location_id);
END;
$$;

-- ---- BR-002: only an admin grants a role, and every grant is audited --------------------------------------
-- rpc: user_account update app_grant_role
CREATE OR REPLACE FUNCTION public.app_grant_role(p_user_id uuid, p_role text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT app.has_role('admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('member', 'partner', 'vfda_staff', 'vfda_legal', 'admin') THEN
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

-- ---- BR-005: delete my account = deactivate at once, never delete ------------------------------------------
CREATE OR REPLACE FUNCTION public.app_deactivate_my_account()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.user_account SET account_status = 'deactivated' WHERE user_id = v_user;
  INSERT INTO public.audit_log (audit_log_id, action, admin_id, target_id, logged_at)
  VALUES (gen_random_uuid(), 'account.deactivate', v_user, v_user, now());
  RETURN jsonb_build_object('user_id', v_user, 'account_status', 'deactivated');
END;
$$;

-- ---- BR-005: within 30 days, replace the name and email of deactivated accounts (System only) -------------
CREATE OR REPLACE FUNCTION public.app_anonymise_deactivated()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.profile p SET full_name = 'Former member'
   WHERE p.full_name <> 'Former member'
     AND EXISTS (SELECT 1 FROM public.user_account u WHERE u.user_id = p.user_id AND u.account_status = 'deactivated');
  UPDATE public.user_account SET email = 'former-member-' || user_id || '@invalid'
   WHERE account_status = 'deactivated' AND email NOT LIKE 'former-member-%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Who may call what
REVOKE ALL ON FUNCTION public.app_admin_save_location(uuid, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_admin_save_contact(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_admin_verify_contact(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_admin_publish_location(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_admin_unpublish_location(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_grant_role(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_deactivate_my_account() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.app_anonymise_deactivated() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_admin_save_location(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_admin_save_contact(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_admin_verify_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_admin_publish_location(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_admin_unpublish_location(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_grant_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_deactivate_my_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_anonymise_deactivated() TO service_role;
