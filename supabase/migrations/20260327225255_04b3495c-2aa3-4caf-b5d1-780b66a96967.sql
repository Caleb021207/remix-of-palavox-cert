
-- ============================================
-- Palavox Cert English — Phase 1A Schema
-- ============================================

-- 1. Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.cefr_level AS ENUM ('Pre-A1', 'A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C1+', 'C2');
CREATE TYPE public.test_section_type AS ENUM ('reading', 'listening', 'writing', 'speaking', 'conversation');
CREATE TYPE public.difficulty_tier AS ENUM ('foundation', 'functional', 'professional');
CREATE TYPE public.score_pass_type AS ENUM ('primary', 'audit', 'adjudication');
CREATE TYPE public.purchase_status AS ENUM ('pending', 'paid', 'refunded', 'expired');
CREATE TYPE public.attempt_status AS ENUM ('in_progress', 'completed', 'abandoned', 'flagged');
CREATE TYPE public.section_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE public.fraud_flag_type AS ENUM ('copy_paste', 'timing_anomaly', 'voice_mismatch', 'ai_writing_suspicion', 'ip_repeat', 'device_repeat', 'other');

-- 2. Utility function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3. User roles table (security-critical, per instructions)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 4. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  native_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by owner" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Organizations
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view own org" ON public.organization_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Org viewable by members" ON public.organizations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage orgs" ON public.organizations FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 6. Test products & purchases
CREATE TABLE public.test_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 599,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.test_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products viewable by all" ON public.test_products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON public.test_products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.test_products(id) NOT NULL,
  status purchase_status NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  voucher_code_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own purchases" ON public.purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own purchases" ON public.purchases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.voucher_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  organization_id UUID REFERENCES public.organizations(id),
  product_id UUID REFERENCES public.test_products(id) NOT NULL,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.voucher_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vouchers viewable by admins" ON public.voucher_codes FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read active vouchers for validation" ON public.voucher_codes FOR SELECT USING (active = true);

-- 7. Test sessions & attempts
CREATE TABLE public.test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  purchase_id UUID REFERENCES public.purchases(id),
  status attempt_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '3 hours'),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON public.test_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.test_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.test_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_test_sessions_updated_at BEFORE UPDATE ON public.test_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.test_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.test_sessions(id) ON DELETE CASCADE NOT NULL,
  section_type test_section_type NOT NULL,
  difficulty_tier difficulty_tier NOT NULL DEFAULT 'foundation',
  status section_status NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.test_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sections" ON public.test_sections FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.test_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can manage own sections" ON public.test_sections FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.test_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update own sections" ON public.test_sections FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.test_sessions WHERE id = session_id AND user_id = auth.uid())
);

-- 8. Item bank
CREATE TABLE public.item_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type test_section_type NOT NULL,
  difficulty_tier difficulty_tier NOT NULL,
  cefr_target cefr_level NOT NULL,
  topic TEXT NOT NULL,
  grammar_target TEXT,
  vocabulary_band TEXT,
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  distractor_quality TEXT,
  bias_flag BOOLEAN DEFAULT false,
  content_safety_flag BOOLEAN DEFAULT false,
  difficulty_score NUMERIC(3,2) DEFAULT 0.5,
  family_id UUID,
  active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.item_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items viewable by authenticated" ON public.item_bank FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage items" ON public.item_bank FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_item_bank_updated_at BEFORE UPDATE ON public.item_bank FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_item_bank_section_difficulty ON public.item_bank(section_type, difficulty_tier, cefr_target);
CREATE INDEX idx_item_bank_family ON public.item_bank(family_id);

CREATE TABLE public.item_audio_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.item_bank(id) ON DELETE CASCADE NOT NULL,
  audio_url TEXT NOT NULL,
  voice TEXT,
  duration_ms INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.item_audio_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audio viewable by authenticated" ON public.item_audio_assets FOR SELECT TO authenticated USING (true);

-- 9. Writing & speaking prompts
CREATE TABLE public.writing_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cefr_target cefr_level NOT NULL,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('practical', 'extended')),
  prompt_text TEXT NOT NULL,
  rubric JSONB,
  active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.writing_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prompts viewable by authenticated" ON public.writing_prompts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage prompts" ON public.writing_prompts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.speaking_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cefr_target cefr_level NOT NULL,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('read_aloud', 'short_response', 'situational')),
  prompt_text TEXT NOT NULL,
  reference_audio_url TEXT,
  rubric JSONB,
  active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.speaking_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Speaking prompts viewable by authenticated" ON public.speaking_prompts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage speaking prompts" ON public.speaking_prompts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 10. Responses
CREATE TABLE public.responses_mcq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.test_sections(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES public.item_bank(id) NOT NULL,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.responses_mcq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own mcq responses" ON public.responses_mcq FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.test_sections ts JOIN public.test_sessions s ON ts.session_id = s.id WHERE ts.id = section_id AND s.user_id = auth.uid())
);
CREATE POLICY "Users can insert own mcq responses" ON public.responses_mcq FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.test_sections ts JOIN public.test_sessions s ON ts.session_id = s.id WHERE ts.id = section_id AND s.user_id = auth.uid())
);

CREATE TABLE public.responses_writing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.test_sections(id) ON DELETE CASCADE NOT NULL,
  prompt_id UUID REFERENCES public.writing_prompts(id) NOT NULL,
  response_text TEXT NOT NULL,
  word_count INTEGER,
  time_spent_ms INTEGER,
  copy_paste_events INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.responses_writing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own writing responses" ON public.responses_writing FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.test_sections ts JOIN public.test_sessions s ON ts.session_id = s.id WHERE ts.id = section_id AND s.user_id = auth.uid())
);
CREATE POLICY "Users can insert own writing responses" ON public.responses_writing FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.test_sections ts JOIN public.test_sessions s ON ts.session_id = s.id WHERE ts.id = section_id AND s.user_id = auth.uid())
);

CREATE TABLE public.responses_speaking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.test_sections(id) ON DELETE CASCADE NOT NULL,
  prompt_id UUID REFERENCES public.speaking_prompts(id) NOT NULL,
  audio_storage_path TEXT NOT NULL,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.responses_speaking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own speaking responses" ON public.responses_speaking FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.test_sections ts JOIN public.test_sessions s ON ts.session_id = s.id WHERE ts.id = section_id AND s.user_id = auth.uid())
);
CREATE POLICY "Users can insert own speaking responses" ON public.responses_speaking FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.test_sections ts JOIN public.test_sessions s ON ts.session_id = s.id WHERE ts.id = section_id AND s.user_id = auth.uid())
);

-- 11. Scores
CREATE TABLE public.scores_section (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.test_sections(id) ON DELETE CASCADE NOT NULL,
  pass_type score_pass_type NOT NULL DEFAULT 'primary',
  raw_score NUMERIC(5,2),
  weighted_score NUMERIC(5,2),
  cefr_level cefr_level,
  rubric_scores JSONB,
  evidence JSONB,
  error_tags JSONB,
  confidence NUMERIC(3,2),
  human_review_recommended BOOLEAN DEFAULT false,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scores_section ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own section scores" ON public.scores_section FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.test_sections ts JOIN public.test_sessions s ON ts.session_id = s.id WHERE ts.id = section_id AND s.user_id = auth.uid())
);

CREATE TABLE public.scores_overall (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.test_sessions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  overall_cefr cefr_level NOT NULL,
  functional_label TEXT NOT NULL,
  confidence_band TEXT,
  reading_cefr cefr_level,
  listening_cefr cefr_level,
  writing_cefr cefr_level,
  speaking_cefr cefr_level,
  reading_score NUMERIC(5,2),
  listening_score NUMERIC(5,2),
  writing_score NUMERIC(5,2),
  speaking_score NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  strengths JSONB,
  next_steps JSONB,
  retake_recommended BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scores_overall ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own overall scores" ON public.scores_overall FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.test_sessions WHERE id = session_id AND user_id = auth.uid())
);

CREATE TABLE public.score_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_score_id UUID REFERENCES public.scores_section(id) ON DELETE CASCADE NOT NULL,
  reviewer_type TEXT NOT NULL DEFAULT 'ai',
  original_cefr cefr_level,
  revised_cefr cefr_level,
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.score_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audits" ON public.score_audits FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 12. Certificates
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.test_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  verification_code TEXT NOT NULL UNIQUE,
  cefr_level cefr_level NOT NULL,
  functional_label TEXT NOT NULL,
  pdf_storage_path TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '2 years'),
  revoked BOOLEAN DEFAULT false
);
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own certificates" ON public.certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public verification by code" ON public.certificates FOR SELECT USING (true);

CREATE TABLE public.certificate_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID REFERENCES public.certificates(id) ON DELETE CASCADE NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verifier_ip TEXT,
  verifier_user_agent TEXT
);
ALTER TABLE public.certificate_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log verifications" ON public.certificate_verifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view verifications" ON public.certificate_verifications FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 13. Compliance & fraud
CREATE TABLE public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  guardian_email TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own consent" ON public.consent_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own consent" ON public.consent_records FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.test_sessions(id) ON DELETE CASCADE NOT NULL,
  flag_type fraud_flag_type NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  details JSONB,
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage fraud flags" ON public.fraud_flags FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.test_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view logs" ON public.event_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert logs" ON public.event_logs FOR INSERT WITH CHECK (true);

-- 14. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('speaking-audio', 'speaking-audio', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('listening-audio', 'listening-audio', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('certificate-pdfs', 'certificate-pdfs', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('rubric-anchors', 'rubric-anchors', false);

-- Storage policies
CREATE POLICY "Users can upload speaking audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'speaking-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own speaking audio" ON storage.objects FOR SELECT USING (bucket_id = 'speaking-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Listening audio publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'listening-audio');
CREATE POLICY "Admins can manage listening audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'listening-audio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own certificate PDFs" ON storage.objects FOR SELECT USING (bucket_id = 'certificate-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "System can upload certificate PDFs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'certificate-pdfs');

-- 15. Seed default product
INSERT INTO public.test_products (name, description, price_cents, currency)
VALUES ('Palavox Cert English', 'AI-scored English proficiency screening and placement certificate aligned to CEFR', 599, 'usd');
