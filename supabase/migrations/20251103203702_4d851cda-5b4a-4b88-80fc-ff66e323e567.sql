-- Phase 6: Database Schema Updates for Adaptive Testing

-- Create adaptive_question_logs table to track each adaptive question attempt
CREATE TABLE IF NOT EXISTS public.adaptive_question_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_session_id UUID NOT NULL REFERENCES public.test_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('reading', 'listening')),
  level TEXT NOT NULL CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  user_answer TEXT,
  correct_answer TEXT,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  confidence_at_question NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_adaptive_logs_session ON public.adaptive_question_logs(test_session_id);
CREATE INDEX idx_adaptive_logs_level ON public.adaptive_question_logs(level);
CREATE INDEX idx_adaptive_logs_section ON public.adaptive_question_logs(section);

-- Add adaptive metadata columns to test_sessions
ALTER TABLE public.test_sessions
ADD COLUMN IF NOT EXISTS is_adaptive BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS adaptive_reading_level TEXT CHECK (adaptive_reading_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
ADD COLUMN IF NOT EXISTS adaptive_listening_level TEXT CHECK (adaptive_listening_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
ADD COLUMN IF NOT EXISTS adaptive_question_count INTEGER DEFAULT 0;

-- Enable RLS on adaptive_question_logs
ALTER TABLE public.adaptive_question_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for adaptive_question_logs
CREATE POLICY "Users can view their own adaptive logs"
ON public.adaptive_question_logs
FOR SELECT
USING (
  test_session_id IN (
    SELECT id FROM public.test_sessions 
    WHERE user_id = auth.uid() OR auth.uid() IS NULL
  )
);

CREATE POLICY "Service can manage adaptive logs"
ON public.adaptive_question_logs
FOR ALL
USING (true);

-- Add comment for documentation
COMMENT ON TABLE public.adaptive_question_logs IS 'Tracks each question attempt in adaptive testing for analytics and debugging';