-- Search indexes: physical design, kept out of the logical data model as tools/dm_model2.py records
-- (specs/003-sys-core decision D9; research R13 for FR-010). FR-011 is deferred (see the end of this file).

-- ---- FR-010: accent-insensitive Vietnamese text search ------------------------------------------------
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- unaccent() is STABLE; an index needs an IMMUTABLE wrapper with an explicit dictionary.
CREATE OR REPLACE FUNCTION app.f_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT SET search_path = ''
AS $$
  SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;
GRANT EXECUTE ON FUNCTION app.f_unaccent(text) TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_location_text_search
  ON public.location USING gin (to_tsvector('simple'::regconfig, app.f_unaccent(
    COALESCE(name_vi, '') || ' ' || COALESCE(name_en, '') || ' ' || COALESCE(desc_vi, '') || ' ' || COALESCE(desc_en, ''))));

CREATE INDEX IF NOT EXISTS idx_organisation_member_layer_text_search
  ON public.organisation_member_layer USING gin (to_tsvector('simple'::regconfig, app.f_unaccent(
    COALESCE(capability_desc_vi, '') || ' ' || COALESCE(capability_desc_en, ''))));

-- Published locations matching a search typed with or without diacritics (caller's RLS applies).
CREATE OR REPLACE FUNCTION public.app_search_locations(q text)
RETURNS SETOF public.location
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT l.* FROM public.location l
   WHERE l.intake_status = 'published' AND l.published
     AND to_tsvector('simple'::regconfig, app.f_unaccent(
           COALESCE(l.name_vi, '') || ' ' || COALESCE(l.name_en, '') || ' ' || COALESCE(l.desc_vi, '') || ' ' || COALESCE(l.desc_en, '')))
         @@ plainto_tsquery('simple'::regconfig, app.f_unaccent(q))
$$;
GRANT EXECUTE ON FUNCTION public.app_search_locations(text) TO anon, authenticated;

-- FR-011 (F-SYS-11, Could) is deferred: the embedding model and the vector dimension are open question 3
-- of the SYS spec. No vector extension, embedding column, HNSW index or match RPC until it is answered
-- (specs/003-sys-core/plan.md, Complexity Tracking).
