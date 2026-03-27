-- ============================================
-- Phase 1: Atomic Item Claiming (Race-Safe)
-- ============================================

-- Replace the old get_least_used_pool_item with atomic claim
-- This uses FOR UPDATE SKIP LOCKED to prevent race conditions
CREATE OR REPLACE FUNCTION public.claim_least_used_pool_item(
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
  WITH picked AS (
    SELECT ccp.id
    FROM public.cert_content_pool ccp
    WHERE ccp.section = p_section
      AND ccp.level   = p_level
      AND ccp.language= p_language
      AND ccp.version = p_version
      AND (p_exclude_hashes IS NULL OR ccp.stem_hash IS NULL OR NOT (ccp.stem_hash = ANY(p_exclude_hashes)))
    ORDER BY 
      ccp.used_count ASC,
      ccp.last_used_at ASC NULLS FIRST,
      RANDOM()
    LIMIT 1
    FOR UPDATE SKIP LOCKED  -- Race-safe: skip if another transaction has locked this row
  )
  UPDATE public.cert_content_pool c
  SET 
    used_count  = c.used_count + 1,
    last_used_at= now()
  FROM picked
  WHERE c.id = picked.id
  RETURNING 
    c.id, 
    c.section, 
    c.level, 
    c.language, 
    c.version, 
    c.payload, 
    c.used_count, 
    c.stem_hash;
END;
$$;

-- Keep the old increment function for backward compatibility
-- but it won't be used in the new atomic flow
-- (Can be removed later if not needed elsewhere)