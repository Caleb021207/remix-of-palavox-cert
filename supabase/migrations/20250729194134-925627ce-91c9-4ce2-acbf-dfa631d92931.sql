-- Fix remaining database function security issues
-- These are the functions causing the remaining WARN issues

-- Update select_diverse_questions with proper security settings
CREATE OR REPLACE FUNCTION public.select_diverse_questions(
  p_test_type text, 
  p_level text, 
  p_count integer
)
RETURNS SETOF questions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  valid_test_types TEXT[] := ARRAY['reading', 'listening', 'speaking', 'writing', 'pronunciation'];
  valid_levels TEXT[] := ARRAY['novice', 'intermediate', 'advanced'];
BEGIN
  -- Input validation
  IF p_test_type IS NULL OR p_level IS NULL THEN
    RAISE EXCEPTION 'Required parameters cannot be null';
  END IF;
  
  IF NOT (p_test_type = ANY(valid_test_types)) THEN
    RAISE EXCEPTION 'Invalid test type: %', p_test_type;
  END IF;
  
  IF NOT (p_level = ANY(valid_levels)) THEN
    RAISE EXCEPTION 'Invalid level: %', p_level;
  END IF;
  
  IF p_count <= 0 OR p_count > 50 THEN
    RAISE EXCEPTION 'Count must be between 1 and 50';
  END IF;

  -- Log the function usage
  PERFORM public.log_security_event(
    'select_diverse_questions',
    'questions',
    NULL,
    jsonb_build_object(
      'test_type', p_test_type,
      'level', p_level,
      'count', p_count
    )
  );

  -- Update usage count for selected questions and return them
  RETURN QUERY
  WITH selected_questions AS (
    SELECT *
    FROM public.questions
    WHERE type = p_test_type AND level = p_level
    ORDER BY 
      usage_count ASC,
      last_used_at ASC NULLS FIRST,
      RANDOM()
    LIMIT p_count
  )
  UPDATE public.questions 
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW()
  FROM selected_questions
  WHERE public.questions.id = selected_questions.id
  RETURNING public.questions.*;
END;
$function$;