-- Update claim_least_used_pool_item to support session-level deduplication
DROP FUNCTION IF EXISTS public.claim_least_used_pool_item(text, text, text, text, text[]);

CREATE OR REPLACE FUNCTION public.claim_least_used_pool_item(
  p_section text,
  p_level text,
  p_language text,
  p_version text,
  p_exclude_hashes text[] DEFAULT ARRAY[]::text[],
  p_exclude_pool_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS TABLE(
  id uuid,
  section text,
  level text,
  language text,
  version text,
  payload jsonb,
  used_count integer,
  stem_hash text
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
    c.stem_hash;
END;
$function$;