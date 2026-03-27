-- Create prewarm_jobs table for tracking background generation tasks
CREATE TABLE public.prewarm_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  progress JSONB DEFAULT '{"processed": 0, "totalGenerated": 0, "totalSkipped": 0, "remaining": 432}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.prewarm_jobs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read job status (for polling)
CREATE POLICY "Anyone can read job status"
ON public.prewarm_jobs
FOR SELECT
USING (true);

-- Service role can manage jobs
CREATE POLICY "Service can manage jobs"
ON public.prewarm_jobs
FOR ALL
USING (true);

-- Create index for faster queries
CREATE INDEX idx_prewarm_jobs_status ON public.prewarm_jobs(status);
CREATE INDEX idx_prewarm_jobs_created_at ON public.prewarm_jobs(created_at DESC);