-- ============================================
-- Phase 1 Fixes: Enable Multi-Item Pool
-- ============================================

-- 1. Remove the restrictive UNIQUE constraint
ALTER TABLE public.cert_content_pool 
  DROP CONSTRAINT IF EXISTS cert_content_pool_section_level_language_version_usage_context_key;

-- 2. Add stem_hash for duplicate detection (optional but recommended)
ALTER TABLE public.cert_content_pool 
  ADD COLUMN IF NOT EXISTS stem_hash text;

-- 3. Add fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_ccp_sllv 
  ON public.cert_content_pool (section, level, language, version);

CREATE INDEX IF NOT EXISTS idx_ccp_usage 
  ON public.cert_content_pool (used_count, last_used_at);

-- 4. Add unique constraint on stem_hash to prevent exact duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ccp_stemhash 
  ON public.cert_content_pool (section, level, language, version, COALESCE(stem_hash, ''));

-- 5. Add stem_hash to usage tracking
ALTER TABLE public.cert_item_usage 
  ADD COLUMN IF NOT EXISTS stem_hash text;

-- 6. Add indexes for usage table
CREATE INDEX IF NOT EXISTS idx_ciu_session 
  ON public.cert_item_usage (test_session_id);

CREATE INDEX IF NOT EXISTS idx_ciu_pool 
  ON public.cert_item_usage (pool_id);

-- 7. Create cache events table for accurate hit rate tracking
CREATE TABLE IF NOT EXISTS public.cert_cache_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  level text NOT NULL,
  language text NOT NULL,
  version text NOT NULL,
  cache_hit boolean NOT NULL,
  test_session_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cce_hit 
  ON public.cert_cache_events (cache_hit);

CREATE INDEX IF NOT EXISTS idx_cce_created 
  ON public.cert_cache_events (created_at);

-- 8. Enable RLS on new table
ALTER TABLE public.cert_cache_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cache events" ON public.cert_cache_events 
  FOR SELECT USING (true);

CREATE POLICY "Service can manage cache events" ON public.cert_cache_events 
  FOR ALL USING (true);

-- 9. Update increment function to set last_used_at correctly
CREATE OR REPLACE FUNCTION public.increment_pool_usage(pool_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.cert_content_pool
  SET used_count = used_count + 1,
      last_used_at = now()
  WHERE id = pool_id;
END;
$$;

-- 10. Add helper function to get least-used item
CREATE OR REPLACE FUNCTION public.get_least_used_pool_item(
  p_section text,
  p_level text,
  p_language text,
  p_version text,
  p_exclude_hashes text[] DEFAULT ARRAY[]::text[]
)
RETURNS TABLE (
  id uuid,
  section text,
  level text,
  language text,
  version text,
  payload jsonb,
  used_count int,
  stem_hash text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ccp.id,
    ccp.section,
    ccp.level,
    ccp.language,
    ccp.version,
    ccp.payload,
    ccp.used_count,
    ccp.stem_hash
  FROM public.cert_content_pool ccp
  WHERE ccp.section = p_section
    AND ccp.level = p_level
    AND ccp.language = p_language
    AND ccp.version = p_version
    AND (p_exclude_hashes IS NULL OR ccp.stem_hash IS NULL OR NOT (ccp.stem_hash = ANY(p_exclude_hashes)))
  ORDER BY 
    ccp.used_count ASC,
    ccp.last_used_at ASC NULLS FIRST,
    RANDOM()
  LIMIT 1;
END;
$$;