-- Optional school scoping for school_admin roles (referenced by the cert-code functions)
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS school_id text;

CREATE TABLE public.certification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  school_id text NOT NULL,
  student_id text NOT NULL,
  student_name text,
  generated_by uuid,
  expires_at timestamptz,
  max_uses integer NOT NULL DEFAULT 3,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.certification_codes TO authenticated;
GRANT ALL ON public.certification_codes TO service_role;

ALTER TABLE public.certification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all certification codes"
ON public.certification_codes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "School admins can view codes they issued"
ON public.certification_codes FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'school_admin')
  AND (
    generated_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'school_admin'
        AND ur.school_id = certification_codes.school_id
    )
  )
);

CREATE TRIGGER update_certification_codes_updated_at
BEFORE UPDATE ON public.certification_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_certification_codes_school ON public.certification_codes (school_id);

CREATE TABLE public.code_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  school_id text NOT NULL,
  student_id text NOT NULL,
  test_session_id text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.code_usage_log TO authenticated;
GRANT ALL ON public.code_usage_log TO service_role;

ALTER TABLE public.code_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all code usage"
ON public.code_usage_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "School admins can view their school code usage"
ON public.code_usage_log FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'school_admin')
  AND EXISTS (
    SELECT 1 FROM public.certification_codes cc
    WHERE cc.code = code_usage_log.code
      AND (
        cc.generated_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role = 'school_admin'
            AND ur.school_id = cc.school_id
        )
      )
  )
);

CREATE UNIQUE INDEX idx_code_usage_unique ON public.code_usage_log (code, test_session_id);
CREATE INDEX idx_code_usage_code ON public.code_usage_log (code);