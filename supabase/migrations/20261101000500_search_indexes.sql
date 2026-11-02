-- Search indexes: physical design, kept out of the logical data model as tools/dm_model2.py records
-- (specs/003-sys-core decision D9; research R13 for FR-010, R14 for FR-011 / D8).

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

-- ---- FR-011: semantic index (Gemini embeddings, 768 dimensions) -----------------------------------------
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

ALTER TABLE public.location ADD COLUMN IF NOT EXISTS embedding extensions.vector(768);
ALTER TABLE public.organisation_member_layer ADD COLUMN IF NOT EXISTS embedding extensions.vector(768);

CREATE INDEX IF NOT EXISTS idx_location_embedding
  ON public.location USING hnsw (embedding extensions.vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_organisation_member_layer_embedding
  ON public.organisation_member_layer USING hnsw (embedding extensions.vector_cosine_ops);

-- Published locations nearest to an embedded query (caller's RLS applies).
CREATE OR REPLACE FUNCTION public.app_match_locations(query_embedding extensions.vector(768), match_count integer)
RETURNS TABLE (location_id uuid, slug varchar, name_en varchar, similarity double precision)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = 'public, extensions'
AS $$
  SELECT l.location_id, l.slug, l.name_en, 1 - (l.embedding <=> query_embedding) AS similarity
    FROM public.location l
   WHERE l.intake_status = 'published' AND l.published AND l.embedding IS NOT NULL
   ORDER BY l.embedding <=> query_embedding
   LIMIT GREATEST(match_count, 1)
$$;
GRANT EXECUTE ON FUNCTION public.app_match_locations(extensions.vector, integer) TO anon, authenticated;
