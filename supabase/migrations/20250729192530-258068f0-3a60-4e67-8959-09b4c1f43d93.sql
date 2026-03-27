-- Critical Security Fixes

-- 1. Add RLS policy to question_analytics table
CREATE POLICY "Authenticated users can view question analytics" 
ON public.question_analytics 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "System can insert/update question analytics" 
ON public.question_analytics 
FOR ALL 
TO service_role
USING (true);

-- 2. Fix database functions with proper security
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
SET search_path = public
AS $function$
DECLARE
  total_available INTEGER;
  selected_count INTEGER := 0;
BEGIN
  -- Validate inputs to prevent injection
  IF p_test_type IS NULL OR p_level IS NULL OR p_language IS NULL THEN
    RAISE EXCEPTION 'Required parameters cannot be null';
  END IF;
  
  IF p_count <= 0 OR p_count > 100 THEN
    RAISE EXCEPTION 'Count must be between 1 and 100';
  END IF;

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

-- 3. Fix trigger_question_generation function
CREATE OR REPLACE FUNCTION public.trigger_question_generation(
    p_test_type text, 
    p_level text, 
    p_language text DEFAULT 'spanish'::text, 
    p_target_count integer DEFAULT 500
)
RETURNS TABLE(current_count integer, target_count integer, needs_generation boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_q_count INTEGER;
BEGIN
  -- Validate inputs
  IF p_test_type IS NULL OR p_level IS NULL OR p_language IS NULL THEN
    RAISE EXCEPTION 'Required parameters cannot be null';
  END IF;
  
  IF p_target_count <= 0 OR p_target_count > 10000 THEN
    RAISE EXCEPTION 'Target count must be between 1 and 10000';
  END IF;

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

-- 4. Fix overly permissive RLS policies
DROP POLICY IF EXISTS "Users can access their test content" ON public.test_content;
CREATE POLICY "Users can access their test content" 
ON public.test_content 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.test_sessions 
    WHERE test_sessions.id = test_content.session_id 
    AND (test_sessions.user_id = auth.uid() OR auth.uid() IS NULL)
  )
);

CREATE POLICY "Users can insert test content" 
ON public.test_content 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.test_sessions 
    WHERE test_sessions.id = test_content.session_id 
    AND (test_sessions.user_id = auth.uid() OR auth.uid() IS NULL)
  )
);

DROP POLICY IF EXISTS "Users can view their own phase results" ON public.test_phase_results;
CREATE POLICY "Users can view their phase results" 
ON public.test_phase_results 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.test_sessions 
    WHERE test_sessions.id = test_phase_results.session_id 
    AND (test_sessions.user_id = auth.uid() OR auth.uid() IS NULL)
  )
);

CREATE POLICY "Users can insert phase results" 
ON public.test_phase_results 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.test_sessions 
    WHERE test_sessions.id = test_phase_results.session_id 
    AND (test_sessions.user_id = auth.uid() OR auth.uid() IS NULL)
  )
);

-- 5. Add audit logging table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access audit logs
CREATE POLICY "Service role can access audit logs" 
ON public.security_audit_log 
FOR ALL 
TO service_role
USING (true);

-- 6. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  );
END;
$function$;