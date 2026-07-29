-- ── benchmark_windows ────────────────────────────────────────
CREATE TABLE public.benchmark_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                -- fall | winter | spring
  school_year text NOT NULL,         -- e.g. '2025-2026'
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  sequence integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_year, name)
);

GRANT SELECT ON public.benchmark_windows TO authenticated;
GRANT ALL ON public.benchmark_windows TO service_role;
ALTER TABLE public.benchmark_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read benchmark windows"
  ON public.benchmark_windows FOR SELECT TO authenticated USING (active);

CREATE TRIGGER update_benchmark_windows_updated_at
  BEFORE UPDATE ON public.benchmark_windows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── classes / roster ─────────────────────────────────────────
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  school_id text,
  grade_band text,
  teacher_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.class_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, student_id)
);

CREATE INDEX idx_class_students_student ON public.class_students(student_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_students TO authenticated;
GRANT ALL ON public.class_students TO service_role;

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- security-definer helper: is the caller the teacher of this student?
CREATE OR REPLACE FUNCTION public.is_class_teacher_of(_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_students cs
    JOIN public.classes c ON c.id = cs.class_id
    WHERE cs.student_id = _student_id
      AND c.teacher_id = auth.uid()
  )
$$;

CREATE POLICY "Teachers manage their own classes"
  ON public.classes FOR ALL TO authenticated
  USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers manage their own rosters"
  ON public.class_students FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_id AND c.teacher_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Students can see their own roster rows"
  ON public.class_students FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- ── readiness thresholds (configurable) ──────────────────────
CREATE TABLE public.readiness_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,                       -- ell_reclassification | seal_of_biliteracy
  label text NOT NULL,
  wida_composite_min numeric,
  actfl_level text,
  cefr_min text,
  approaching_margin numeric NOT NULL DEFAULT 0.5,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind)
);

GRANT SELECT ON public.readiness_thresholds TO authenticated;
GRANT ALL ON public.readiness_thresholds TO service_role;
ALTER TABLE public.readiness_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can read readiness thresholds"
  ON public.readiness_thresholds FOR SELECT TO authenticated USING (active);

CREATE TRIGGER update_readiness_thresholds_updated_at
  BEFORE UPDATE ON public.readiness_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── longitudinal link on proficiency_results ─────────────────
ALTER TABLE public.proficiency_results
  ADD COLUMN window_id uuid REFERENCES public.benchmark_windows(id);

CREATE INDEX idx_proficiency_results_user_skill ON public.proficiency_results(user_id, skill, created_at);

CREATE OR REPLACE FUNCTION public.set_result_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.window_id IS NULL THEN
    SELECT w.id INTO NEW.window_id
    FROM public.benchmark_windows w
    WHERE w.active
      AND (NEW.created_at::date) BETWEEN w.starts_on AND w.ends_on
    ORDER BY w.starts_on DESC
    LIMIT 1;
  END IF;
  IF NEW.test_window IS NULL AND NEW.window_id IS NOT NULL THEN
    SELECT w.name || ' ' || w.school_year INTO NEW.test_window
    FROM public.benchmark_windows w WHERE w.id = NEW.window_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_result_window
  BEFORE INSERT ON public.proficiency_results
  FOR EACH ROW EXECUTE FUNCTION public.set_result_window();

-- teacher read access to student evidence
CREATE POLICY "Teachers read results for their students"
  ON public.proficiency_results FOR SELECT TO authenticated
  USING (public.is_class_teacher_of(user_id));

CREATE POLICY "Teachers read item responses for their students"
  ON public.item_responses FOR SELECT TO authenticated
  USING (public.is_class_teacher_of(user_id));

-- ── views (RLS of base tables applies) ───────────────────────
CREATE VIEW public.v_skill_trend
WITH (security_invoker = true) AS
  SELECT
    pr.user_id,
    pr.skill,
    pr.window_id,
    w.name          AS window_name,
    w.school_year,
    w.sequence      AS window_sequence,
    w.starts_on     AS window_starts_on,
    pr.scaled_score,
    pr.sem,
    pr.wida_level,
    pr.wida_low,
    pr.wida_high,
    pr.cefr_band,
    pr.n_scored,
    pr.n_correct,
    pr.created_at
  FROM public.proficiency_results pr
  LEFT JOIN public.benchmark_windows w ON w.id = pr.window_id;

GRANT SELECT ON public.v_skill_trend TO authenticated;
GRANT SELECT ON public.v_skill_trend TO service_role;

CREATE VIEW public.v_can_do_progress
WITH (security_invoker = true) AS
  SELECT
    ir.user_id,
    m.can_do_id,
    cd.statement,
    cd.framework,
    cd.level,
    cd.skill_or_mode,
    count(*)::int                                   AS n_attempts,
    count(*) FILTER (WHERE ir.is_correct)::int      AS n_correct,
    CASE
      WHEN count(*) >= 3
       AND (count(*) FILTER (WHERE ir.is_correct))::numeric / count(*) >= 0.8 THEN 'met'
      WHEN count(*) >= 2
       AND (count(*) FILTER (WHERE ir.is_correct))::numeric / count(*) >= 0.5 THEN 'approaching'
      ELSE 'practiced'
    END AS status,
    max(ir.created_at) AS last_practiced_at
  FROM public.item_responses ir
  JOIN public.item_can_do_map m ON m.item_id = ir.item_id
  JOIN public.can_do_statements cd ON cd.id = m.can_do_id
  WHERE ir.is_trial = false
  GROUP BY ir.user_id, m.can_do_id, cd.statement, cd.framework, cd.level, cd.skill_or_mode;

GRANT SELECT ON public.v_can_do_progress TO authenticated;
GRANT SELECT ON public.v_can_do_progress TO service_role;