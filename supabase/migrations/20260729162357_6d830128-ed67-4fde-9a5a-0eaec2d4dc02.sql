-- ── cut_scores ───────────────────────────────────────────────
CREATE TABLE public.cut_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill text NOT NULL,
  wida_level integer NOT NULL CHECK (wida_level BETWEEN 1 AND 6),
  min_scaled numeric NOT NULL,
  max_scaled numeric NOT NULL,
  cefr_band text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (skill, wida_level)
);

GRANT SELECT ON public.cut_scores TO authenticated;
GRANT ALL ON public.cut_scores TO service_role;
ALTER TABLE public.cut_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read cut scores"
  ON public.cut_scores FOR SELECT TO authenticated USING (active);

CREATE TRIGGER update_cut_scores_updated_at
  BEFORE UPDATE ON public.cut_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── item_responses ───────────────────────────────────────────
CREATE TABLE public.item_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  form_id uuid,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  selected_option_id uuid,
  is_correct boolean NOT NULL DEFAULT false,
  is_trial boolean NOT NULL DEFAULT false,
  response_time_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_item_responses_session ON public.item_responses(session_id);
CREATE INDEX idx_item_responses_item ON public.item_responses(item_id);

GRANT SELECT ON public.item_responses TO authenticated;
GRANT ALL ON public.item_responses TO service_role;
ALTER TABLE public.item_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read their own item responses"
  ON public.item_responses FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ── proficiency_results ──────────────────────────────────────
CREATE TABLE public.proficiency_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL,
  form_id uuid,
  skill text NOT NULL,
  scaled_score numeric NOT NULL,
  sem numeric,
  wida_level integer,
  wida_low integer,
  wida_high integer,
  cefr_band text,
  n_scored integer NOT NULL DEFAULT 0,
  n_correct integer NOT NULL DEFAULT 0,
  test_window text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proficiency_results_session ON public.proficiency_results(session_id);
CREATE UNIQUE INDEX idx_proficiency_results_session_skill ON public.proficiency_results(session_id, skill);

GRANT SELECT ON public.proficiency_results TO authenticated;
GRANT ALL ON public.proficiency_results TO service_role;
ALTER TABLE public.proficiency_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read their own proficiency results"
  ON public.proficiency_results FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_proficiency_results_updated_at
  BEFORE UPDATE ON public.proficiency_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── server-side counters ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bump_item_exposure(_item_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.items SET exposure_count = exposure_count + 1
  WHERE id = ANY(_item_ids);
$$;

REVOKE ALL ON FUNCTION public.bump_item_exposure(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_item_exposure(uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.bump_item_responses(_item_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.item_stats (item_id, n_responses, updated_at)
  SELECT unnest(_item_ids), 1, now()
  ON CONFLICT (item_id) DO UPDATE
    SET n_responses = public.item_stats.n_responses + 1, updated_at = now();
$$;

REVOKE ALL ON FUNCTION public.bump_item_responses(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_item_responses(uuid[]) TO service_role;