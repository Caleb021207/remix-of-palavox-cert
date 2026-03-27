-- ============================================
-- Phase 1: Foundation Infrastructure
-- ============================================

-- 1. Content Pool: Reusable test items with versioning
CREATE TABLE IF NOT EXISTS public.cert_content_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL CHECK (section IN ('reading','listening','writing','speaking')),
  level text NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1','C2','Advanced','Intermediate','Novice')),
  language text NOT NULL DEFAULT 'english',
  version text NOT NULL,
  usage_context text DEFAULT 'certification' CHECK (usage_context IN ('practice','certification','premium')),
  payload jsonb NOT NULL,
  generation_cost_usd numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  used_count int DEFAULT 0,
  last_used_at timestamptz,
  UNIQUE(section, level, language, version, usage_context)
);

-- 2. Item Usage Tracking: Which items used in each test
CREATE TABLE IF NOT EXISTS public.cert_item_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_session_id uuid NOT NULL REFERENCES public.test_sessions(id) ON DELETE CASCADE,
  pool_id uuid NOT NULL REFERENCES public.cert_content_pool(id),
  section text NOT NULL,
  used_at timestamptz DEFAULT now()
);

-- 3. Cost Metrics: Detailed per-test usage tracking
CREATE TABLE IF NOT EXISTS public.cert_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_session_id uuid NOT NULL REFERENCES public.test_sessions(id) ON DELETE CASCADE,
  model_gen text,
  model_grade text,
  llm_tokens_in int DEFAULT 0,
  llm_tokens_out int DEFAULT 0,
  tts_characters int DEFAULT 0,
  stt_seconds numeric DEFAULT 0,
  realtime_seconds numeric DEFAULT 0,
  estimated_cost_usd numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4. Pricing Config: Unit costs per model (enables price updates without data migration)
CREATE TABLE IF NOT EXISTS public.pricing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL UNIQUE,
  input_cost_per_1k numeric,
  output_cost_per_1k numeric,
  unit_cost numeric,
  unit_type text CHECK (unit_type IN ('token','character','second')),
  effective_date timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert current OpenAI pricing
INSERT INTO public.pricing_config (model, input_cost_per_1k, output_cost_per_1k, unit_type, is_active) VALUES
  ('gpt-4o-mini', 0.00015, 0.0006, 'token', true),
  ('gpt-5', 0.003, 0.015, 'token', true)
ON CONFLICT (model) DO NOTHING;

INSERT INTO public.pricing_config (model, unit_cost, unit_type, is_active) VALUES
  ('tts-1', 0.000015, 'character', true),
  ('tts-1-hd', 0.000030, 'character', true),
  ('whisper-1', 0.0001, 'second', true),
  ('gpt-4o-transcribe', 0.0001, 'second', true),
  ('gpt-realtime', 0.001, 'second', true)
ON CONFLICT (model) DO NOTHING;

-- Enable RLS
ALTER TABLE public.cert_content_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cert_item_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cert_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read content pool" ON public.cert_content_pool 
  FOR SELECT USING (true);

CREATE POLICY "Service can manage content pool" ON public.cert_content_pool 
  FOR ALL USING (true);

CREATE POLICY "Users can view their item usage" ON public.cert_item_usage 
  FOR SELECT USING (
    test_session_id IN (
      SELECT id FROM public.test_sessions 
      WHERE user_id = auth.uid() OR auth.uid() IS NULL
    )
  );

CREATE POLICY "Service can manage item usage" ON public.cert_item_usage 
  FOR ALL USING (true);

CREATE POLICY "Users can view their metrics" ON public.cert_metrics 
  FOR SELECT USING (
    test_session_id IN (
      SELECT id FROM public.test_sessions 
      WHERE user_id = auth.uid() OR auth.uid() IS NULL
    )
  );

CREATE POLICY "Service can manage metrics" ON public.cert_metrics 
  FOR ALL USING (true);

CREATE POLICY "Anyone can read pricing config" ON public.pricing_config 
  FOR SELECT USING (true);

-- Helper function to increment pool usage
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