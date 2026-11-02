-- Link Supabase Auth to user_account, and the role helpers used by every policy.
-- specs/003-sys-core research R2, R5; data-model §2–§3. BR-002 (always member), BR-003 (consent), BR-004 (Auth only).
-- user_account.user_id = auth.users.id, with no foreign key (decision D3).

CREATE SCHEMA IF NOT EXISTS app;
GRANT USAGE ON SCHEMA app TO anon, authenticated, service_role;

-- The role of the signed-in, ACTIVE account; 'guest' otherwise. A deactivated account loses all access at once (BR-005).
CREATE OR REPLACE FUNCTION app.current_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT ua.role FROM public.user_account ua
      WHERE ua.user_id = auth.uid() AND COALESCE(ua.account_status, 'active') = 'active'),
    'guest')
$$;

-- True when the current role is one of the given roles; admin also counts as vfda_staff and vfda_legal (D5).
CREATE OR REPLACE FUNCTION app.has_role(VARIADIC roles text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT app.current_role() = ANY (roles)
      OR (app.current_role() = 'admin' AND roles && ARRAY['vfda_staff', 'vfda_legal'])
$$;

-- True when the signed-in active account belongs to the project.
CREATE OR REPLACE FUNCTION app.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT app.current_role() <> 'guest'
     AND EXISTS (SELECT 1 FROM public.project_member pm WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid())
$$;

GRANT EXECUTE ON FUNCTION app.current_role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.has_role(text[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.is_project_member(uuid) TO anon, authenticated, service_role;

-- Sign-up (or Dashboard "Add user"): one user_account row with the literal role member (BR-002).
-- Nothing in the metadata can set the role, the status or the id. When the sign-up form sent the FR-001
-- fields, the organisation, profile and the consent with its version and time are stored too (BR-003).
CREATE OR REPLACE FUNCTION app.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  new_org uuid;
BEGIN
  -- ON CONFLICT: an email already present in user_account (e.g. loaded from the seed) must not block Auth;
  -- the seed loader re-keys such accounts (research R7).
  INSERT INTO public.user_account (user_id, email, email_verified, role, account_status, created_at)
  VALUES (NEW.id, NEW.email, NEW.email_confirmed_at IS NOT NULL, 'member', 'active', now())
  ON CONFLICT DO NOTHING;

  IF meta ->> 'full_name' IS NOT NULL AND meta ->> 'crew_role' IS NOT NULL AND meta ->> 'org_name' IS NOT NULL
     AND meta ->> 'country' IS NOT NULL AND meta ->> 'consent_version' IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.user_account WHERE user_id = NEW.id) THEN
    new_org := gen_random_uuid();
    INSERT INTO public.producer_organisation (producer_org_id, org_name, country, website)
    VALUES (new_org, meta ->> 'org_name', upper(meta ->> 'country'), NULLIF(meta ->> 'website', ''));

    INSERT INTO public.profile (user_id, full_name, crew_role, locale, producer_org_id)
    VALUES (NEW.id, meta ->> 'full_name', meta ->> 'crew_role', COALESCE(NULLIF(meta ->> 'locale', ''), 'en'), new_org);

    INSERT INTO public.consent (user_id, consent_version, accepted_at)
    VALUES (NEW.id, meta ->> 'consent_version', now());
  END IF;
  RETURN NEW;
END;
$$;

-- Email confirmation and email changes made in Supabase Auth are copied to user_account.
CREATE OR REPLACE FUNCTION app.handle_auth_user_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.user_account
     SET email = NEW.email,
         email_verified = NEW.email_confirmed_at IS NOT NULL
   WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION app.handle_new_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email_confirmed_at, email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION app.handle_auth_user_update();

-- Writes made through Supabase Auth (annotations read by tests/unit/rls-coverage.test.js):
-- rpc: user_account insert app.handle_new_auth_user
-- rpc: producer_organisation insert app.handle_new_auth_user
-- rpc: profile insert app.handle_new_auth_user
-- rpc: consent insert app.handle_new_auth_user
-- rpc: user_account update app.handle_auth_user_update
