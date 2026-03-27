-- ============================================
-- Phase 1: School-Based FERPA Compliance
-- Database Foundation
-- ============================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'school_admin', 'student');

-- 2. Create schools table
CREATE TABLE public.schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  agreement_signed_date TIMESTAMP WITH TIME ZONE,
  agreement_signed_by TEXT,
  agreement_version TEXT DEFAULT '1.0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create user_roles table (security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  school_id TEXT REFERENCES public.schools(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role, school_id)
);

-- 4. Create certification_codes table
CREATE TABLE public.certification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  school_id TEXT REFERENCES public.schools(id) NOT NULL,
  student_id TEXT NOT NULL,
  student_name TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER DEFAULT 3,
  notes TEXT
);

-- 5. Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_codes ENABLE ROW LEVEL SECURITY;

-- 6. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 7. Create security definer function to check school admin access
CREATE OR REPLACE FUNCTION public.is_school_admin(_user_id uuid, _school_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
      AND role = 'school_admin'
      AND (school_id = _school_id OR school_id IS NULL)
  )
$$;

-- 8. RLS Policies for schools table
CREATE POLICY "School admins can view their school"
ON public.schools FOR SELECT
USING (public.is_school_admin(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all schools"
ON public.schools FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 9. RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 10. RLS Policies for certification_codes table
CREATE POLICY "School admins can view their codes"
ON public.certification_codes FOR SELECT
USING (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "School admins can create codes for their school"
ON public.certification_codes FOR INSERT
WITH CHECK (public.is_school_admin(auth.uid(), school_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all codes"
ON public.certification_codes FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- 11. Update test_sessions RLS to allow school admin access
CREATE POLICY "School admins can view their students' sessions"
ON public.test_sessions FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  EXISTS (
    SELECT 1 FROM public.code_usage_log
    WHERE test_session_id = test_sessions.id
      AND public.is_school_admin(auth.uid(), school_id)
  )
);

-- 12. Update code_usage_log to link to certification_codes
ALTER TABLE public.code_usage_log
ADD COLUMN certification_code_id UUID REFERENCES public.certification_codes(id);

-- 13. Create index for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_school_id ON public.user_roles(school_id);
CREATE INDEX idx_certification_codes_school_id ON public.certification_codes(school_id);
CREATE INDEX idx_code_usage_log_school_id ON public.code_usage_log(school_id);
CREATE INDEX idx_code_usage_log_cert_code_id ON public.code_usage_log(certification_code_id);