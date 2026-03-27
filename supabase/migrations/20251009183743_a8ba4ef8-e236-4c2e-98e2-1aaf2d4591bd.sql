-- Create parental consents table
CREATE TABLE public.parental_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  school_id text NOT NULL,
  parent_email text NOT NULL,
  parent_name text,
  consent_given boolean NOT NULL,
  consent_date timestamp with time zone NOT NULL,
  consent_ip inet,
  consent_version text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create user ages table
CREATE TABLE public.user_ages (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  date_of_birth date,
  is_minor boolean,
  verified_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Create data access requests table for FERPA data access/deletion requests
CREATE TABLE public.data_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('view', 'export', 'delete')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'denied')),
  requester_email text NOT NULL,
  requester_relationship text CHECK (requester_relationship IN ('student', 'parent', 'guardian', 'school_official')),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS on all new tables
ALTER TABLE public.parental_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parental_consents
CREATE POLICY "Service can manage consents"
  ON public.parental_consents
  FOR ALL
  USING (true);

CREATE POLICY "Users can view their own consent records"
  ON public.parental_consents
  FOR SELECT
  USING (student_id = auth.uid()::text OR parent_email = auth.email());

-- RLS Policies for user_ages
CREATE POLICY "Service can manage user ages"
  ON public.user_ages
  FOR ALL
  USING (true);

CREATE POLICY "Users can view their own age data"
  ON public.user_ages
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for data_access_requests
CREATE POLICY "Users can view their own requests"
  ON public.data_access_requests
  FOR SELECT
  USING (user_id = auth.uid() OR requester_email = auth.email());

CREATE POLICY "Users can create requests"
  ON public.data_access_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR requester_email = auth.email());

CREATE POLICY "Service can manage requests"
  ON public.data_access_requests
  FOR ALL
  USING (true);

-- Add indexes for performance
CREATE INDEX idx_parental_consents_student_id ON public.parental_consents(student_id);
CREATE INDEX idx_parental_consents_school_id ON public.parental_consents(school_id);
CREATE INDEX idx_data_access_requests_user_id ON public.data_access_requests(user_id);
CREATE INDEX idx_data_access_requests_status ON public.data_access_requests(status);