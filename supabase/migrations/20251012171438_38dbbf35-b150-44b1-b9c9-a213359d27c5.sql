-- Phase 1: Add base_language support to cert_content_pool

-- Add base_language column to track the native language for bilingual content
ALTER TABLE public.cert_content_pool 
ADD COLUMN IF NOT EXISTS base_language text;

-- Add index for fast lookups by base_language
CREATE INDEX IF NOT EXISTS idx_cert_content_pool_base_language 
ON public.cert_content_pool(base_language);

-- Update the claim_least_used_pool_item function to support base_language filtering
CREATE OR REPLACE FUNCTION public.claim_least_used_pool_item(
  p_section text, 
  p_level text, 
  p_language text, 
  p_version text, 
  p_exclude_hashes text[] DEFAULT ARRAY[]::text[], 
  p_exclude_pool_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_base_language text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, 
  section text, 
  level text, 
  language text, 
  version text, 
  payload jsonb, 
  used_count integer, 
  stem_hash text,
  base_language text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT ccp.id
    FROM public.cert_content_pool ccp
    WHERE ccp.section = p_section
      AND ccp.level   = p_level
      AND ccp.language= p_language
      AND ccp.version = p_version
      AND (p_base_language IS NULL OR ccp.base_language = p_base_language)
      AND (p_exclude_hashes IS NULL OR ccp.stem_hash IS NULL OR NOT (ccp.stem_hash = ANY(p_exclude_hashes)))
      AND (p_exclude_pool_ids IS NULL OR NOT (ccp.id = ANY(p_exclude_pool_ids)))
    ORDER BY 
      ccp.used_count ASC,
      ccp.last_used_at ASC NULLS FIRST,
      RANDOM()
    LIMIT 1
    FOR UPDATE SKIP LOCKED
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
    c.stem_hash,
    c.base_language;
END;
$function$;