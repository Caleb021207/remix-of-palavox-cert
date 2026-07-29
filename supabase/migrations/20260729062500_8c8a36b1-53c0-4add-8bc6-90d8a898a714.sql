
-- ============================================================
-- Assessment integrity hardening
-- ============================================================

-- 0. Role enum extension (school-level admins)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'school_admin';

-- 1. Private answer-key store (service_role only)
CREATE TABLE IF NOT EXISTS public.content_answer_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID,
  user_id UUID,
  section TEXT NOT NULL,
  answer_key JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.content_answer_keys TO service_role;
ALTER TABLE public.content_answer_keys ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_content_answer_keys_session ON public.content_answer_keys(session_id, section);

-- 2. Certificates: real holder name + signature for public verification
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS holder_name TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS overall_score NUMERIC(5,2);

-- ============================================================
-- 3. Drop every permissive / client-writable policy
-- ============================================================

-- test_sessions: students may only read their own
DROP POLICY IF EXISTS "Users can create own sessions" ON public.test_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.test_sessions;
CREATE POLICY "Admins can view all sessions" ON public.test_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- test_sections
DROP POLICY IF EXISTS "Users can manage own sections" ON public.test_sections;
DROP POLICY IF EXISTS "Users can update own sections" ON public.test_sections;

-- responses (written by the grading server only)
DROP POLICY IF EXISTS "Users can insert own mcq responses" ON public.responses_mcq;
DROP POLICY IF EXISTS "Users can insert own writing responses" ON public.responses_writing;
DROP POLICY IF EXISTS "Users can insert own speaking responses" ON public.responses_speaking;

-- item bank & prompts: answer keys must never reach the browser
DROP POLICY IF EXISTS "Items viewable by authenticated" ON public.item_bank;
DROP POLICY IF EXISTS "Audio viewable by authenticated" ON public.item_audio_assets;
DROP POLICY IF EXISTS "Prompts viewable by authenticated" ON public.writing_prompts;
DROP POLICY IF EXISTS "Speaking prompts viewable by authenticated" ON public.speaking_prompts;
CREATE POLICY "Admins can view audio assets" ON public.item_audio_assets
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- certificates: no world-readable policy; verification runs server-side
DROP POLICY IF EXISTS "Public verification by code" ON public.certificates;
CREATE POLICY "Admins can view all certificates" ON public.certificates
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- verification + event logs: server writes only
DROP POLICY IF EXISTS "Anyone can log verifications" ON public.certificate_verifications;
DROP POLICY IF EXISTS "System can insert logs" ON public.event_logs;

-- vouchers: admin only (codes are credentials)
DROP POLICY IF EXISTS "Anyone can read active vouchers for validation" ON public.voucher_codes;

-- products: scope the catalogue instead of USING(true)
DROP POLICY IF EXISTS "Products viewable by all" ON public.test_products;
CREATE POLICY "Active products viewable" ON public.test_products
  FOR SELECT TO anon, authenticated USING (active = true);

-- organizations: fix broken self-referencing membership check
DROP POLICY IF EXISTS "Org viewable by members" ON public.organizations;
CREATE POLICY "Org viewable by members" ON public.organizations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organizations.id AND m.user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. Hard privilege lockdown (RLS alone is not enough)
-- ============================================================
REVOKE INSERT, UPDATE, DELETE ON
  public.test_sessions, public.test_sections,
  public.responses_mcq, public.responses_writing, public.responses_speaking,
  public.scores_section, public.scores_overall, public.score_audits,
  public.certificates, public.certificate_verifications,
  public.event_logs, public.fraud_flags, public.voucher_codes
FROM anon, authenticated;

REVOKE SELECT ON
  public.item_bank, public.item_audio_assets,
  public.writing_prompts, public.speaking_prompts,
  public.voucher_codes
FROM anon, authenticated;

GRANT ALL ON
  public.test_sessions, public.test_sections,
  public.responses_mcq, public.responses_writing, public.responses_speaking,
  public.scores_section, public.scores_overall, public.score_audits,
  public.certificates, public.certificate_verifications,
  public.event_logs, public.fraud_flags, public.voucher_codes,
  public.item_bank, public.item_audio_assets,
  public.writing_prompts, public.speaking_prompts
TO service_role;
