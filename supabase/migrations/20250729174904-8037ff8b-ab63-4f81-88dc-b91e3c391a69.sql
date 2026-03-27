-- Create table to track certification code usage
CREATE TABLE public.code_usage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  school_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  test_session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.code_usage_log ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (since codes are validated publicly)
CREATE POLICY "Anyone can insert code usage" 
ON public.code_usage_log 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view code usage" 
ON public.code_usage_log 
FOR SELECT 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_code_usage_log_code ON public.code_usage_log(code);
CREATE INDEX idx_code_usage_log_school_student ON public.code_usage_log(school_id, student_id);