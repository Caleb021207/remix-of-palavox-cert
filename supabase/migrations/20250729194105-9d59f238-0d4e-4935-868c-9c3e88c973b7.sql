-- Critical Security Fixes for Database Functions
-- Fix: Function Search Path Mutable warnings

-- Update log_security_event function with proper security settings
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text, 
  p_resource_type text DEFAULT NULL::text, 
  p_resource_id text DEFAULT NULL::text, 
  p_details jsonb DEFAULT NULL::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Input validation
  IF p_action IS NULL OR length(p_action) = 0 THEN
    RAISE EXCEPTION 'Action cannot be null or empty';
  END IF;
  
  IF length(p_action) > 100 THEN
    RAISE EXCEPTION 'Action length cannot exceed 100 characters';
  END IF;

  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details,
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$function$;

-- Update select_diverse_questions_enhanced with enhanced security
CREATE OR REPLACE FUNCTION public.select_diverse_questions_enhanced(
  p_test_type text, 
  p_level text, 
  p_count integer, 
  p_language text DEFAULT 'spanish'::text, 
  p_avoid_recent_minutes integer DEFAULT 60, 
  p_max_same_topic integer DEFAULT 2, 
  p_max_same_grammar integer DEFAULT 2
)
RETURNS SETOF questions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  total_available INTEGER;
  valid_test_types TEXT[] := ARRAY['reading', 'listening', 'speaking', 'writing', 'pronunciation'];
  valid_levels TEXT[] := ARRAY['novice', 'intermediate', 'advanced'];
  valid_languages TEXT[] := ARRAY['spanish', 'english', 'french', 'german', 'italian', 'portuguese'];
BEGIN
  -- Enhanced input validation
  IF p_test_type IS NULL OR p_level IS NULL OR p_language IS NULL THEN
    RAISE EXCEPTION 'Required parameters cannot be null';
  END IF;
  
  IF NOT (p_test_type = ANY(valid_test_types)) THEN
    RAISE EXCEPTION 'Invalid test type: %', p_test_type;
  END IF;
  
  IF NOT (p_level = ANY(valid_levels)) THEN
    RAISE EXCEPTION 'Invalid level: %', p_level;
  END IF;
  
  IF NOT (p_language = ANY(valid_languages)) THEN
    RAISE EXCEPTION 'Invalid language: %', p_language;
  END IF;
  
  IF p_count <= 0 OR p_count > 50 THEN
    RAISE EXCEPTION 'Count must be between 1 and 50';
  END IF;
  
  IF p_avoid_recent_minutes < 0 OR p_avoid_recent_minutes > 1440 THEN
    RAISE EXCEPTION 'Avoid recent minutes must be between 0 and 1440';
  END IF;

  -- Log the function usage
  PERFORM public.log_security_event(
    'select_diverse_questions',
    'questions',
    NULL,
    jsonb_build_object(
      'test_type', p_test_type,
      'level', p_level,
      'language', p_language,
      'count', p_count
    )
  );

  -- Check how many questions we have available for this language
  SELECT COUNT(*) INTO total_available
  FROM public.questions
  WHERE type = p_test_type AND level = p_level AND language = p_language;
  
  -- If we don't have enough questions, return what we have
  IF total_available < p_count THEN
    RETURN QUERY
    SELECT * FROM public.questions
    WHERE type = p_test_type AND level = p_level AND language = p_language
    ORDER BY usage_count ASC, last_used_at ASC NULLS FIRST, RANDOM()
    LIMIT total_available;
    RETURN;
  END IF;

  -- Smart selection with diversity constraints
  RETURN QUERY
  WITH question_categories AS (
    SELECT 
      q.*,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(topic_category, 'general'), COALESCE(grammar_focus, 'general')
        ORDER BY 
          usage_count ASC,
          last_used_at ASC NULLS FIRST,
          RANDOM()
      ) as category_rank
    FROM public.questions q
    WHERE q.type = p_test_type 
      AND q.level = p_level
      AND q.language = p_language
      AND (q.last_used_at IS NULL OR q.last_used_at < NOW() - INTERVAL '1 minute' * p_avoid_recent_minutes)
  ),
  diverse_selection AS (
    SELECT *
    FROM question_categories
    WHERE category_rank <= GREATEST(1, p_count / 10)
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
  FROM diverse_selection
  WHERE public.questions.id = diverse_selection.id
  RETURNING public.questions.*;
END;
$function$;

-- Update trigger_question_generation with enhanced security
CREATE OR REPLACE FUNCTION public.trigger_question_generation(
  p_test_type text, 
  p_level text, 
  p_language text DEFAULT 'spanish'::text, 
  p_target_count integer DEFAULT 500
)
RETURNS TABLE(current_count integer, target_count integer, needs_generation boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_q_count INTEGER;
  valid_test_types TEXT[] := ARRAY['reading', 'listening', 'speaking', 'writing', 'pronunciation'];
  valid_levels TEXT[] := ARRAY['novice', 'intermediate', 'advanced'];
  valid_languages TEXT[] := ARRAY['spanish', 'english', 'french', 'german', 'italian', 'portuguese'];
BEGIN
  -- Enhanced input validation
  IF p_test_type IS NULL OR p_level IS NULL OR p_language IS NULL THEN
    RAISE EXCEPTION 'Required parameters cannot be null';
  END IF;
  
  IF NOT (p_test_type = ANY(valid_test_types)) THEN
    RAISE EXCEPTION 'Invalid test type: %', p_test_type;
  END IF;
  
  IF NOT (p_level = ANY(valid_levels)) THEN
    RAISE EXCEPTION 'Invalid level: %', p_level;
  END IF;
  
  IF NOT (p_language = ANY(valid_languages)) THEN
    RAISE EXCEPTION 'Invalid language: %', p_language;
  END IF;
  
  IF p_target_count <= 0 OR p_target_count > 5000 THEN
    RAISE EXCEPTION 'Target count must be between 1 and 5000';
  END IF;

  -- Log the function usage
  PERFORM public.log_security_event(
    'trigger_question_generation',
    'questions',
    NULL,
    jsonb_build_object(
      'test_type', p_test_type,
      'level', p_level,
      'language', p_language,
      'target_count', p_target_count
    )
  );

  -- Count existing questions for this language
  SELECT COUNT(*) INTO current_q_count
  FROM public.questions
  WHERE type = p_test_type AND level = p_level AND language = p_language;
  
  RETURN QUERY
  SELECT 
    current_q_count,
    p_target_count,
    (current_q_count < p_target_count) as needs_generation;
END;
$function$;

-- Update generate_test_questions with proper security
CREATE OR REPLACE FUNCTION public.generate_test_questions(
  test_type text, 
  level text, 
  count integer
)
RETURNS SETOF questions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Input validation
  IF test_type IS NULL OR level IS NULL THEN
    RAISE EXCEPTION 'Required parameters cannot be null';
  END IF;
  
  IF count <= 0 OR count > 100 THEN
    RAISE EXCEPTION 'Count must be between 1 and 100';
  END IF;

  -- Log the function usage
  PERFORM public.log_security_event(
    'generate_test_questions',
    'questions',
    NULL,
    jsonb_build_object(
      'test_type', test_type,
      'level', level,
      'count', count
    )
  );

  -- This is a placeholder function that will be replaced with actual OpenAI integration
  -- The actual implementation will be done through edge functions
  RETURN QUERY SELECT * FROM public.questions LIMIT count;
END;
$function$;