-- ============ passages ============
CREATE TABLE public.passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL DEFAULT 'en',
  skill text NOT NULL CHECK (skill IN ('reading','listening')),
  target_wida_level int NOT NULL CHECK (target_wida_level BETWEEN 1 AND 6),
  cefr_level text,
  topic text,
  key_language_use text CHECK (key_language_use IN ('Narrate','Inform','Explain','Argue')),
  title text,
  body text NOT NULL,
  word_count int,
  readability_grade numeric,
  audio_asset_id uuid,
  audio_status text NOT NULL DEFAULT 'not_required',
  source_model text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.passages TO authenticated;
GRANT ALL ON public.passages TO service_role;
ALTER TABLE public.passages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "passages_select_live" ON public.passages FOR SELECT TO authenticated
  USING (status = 'operational' OR public.has_role(auth.uid(),'admin'));

-- ============ items ============
CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill text NOT NULL CHECK (skill IN ('reading','listening')),
  format text NOT NULL CHECK (format IN ('mcq','multi_select','cloze','matching','ordering')),
  stem text NOT NULL,
  passage_id uuid REFERENCES public.passages(id) ON DELETE SET NULL,
  target_wida_level int NOT NULL CHECK (target_wida_level BETWEEN 1 AND 6),
  cefr_level text,
  language text NOT NULL DEFAULT 'en',
  topic text,
  dok int,
  source_model text,
  prompt_version text,
  gate_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','gated','trial','operational','retired')),
  exposure_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.items TO authenticated;
GRANT ALL ON public.items TO service_role;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_select_live" ON public.items FOR SELECT TO authenticated
  USING (status = 'operational' OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_items_skill_level_status ON public.items (skill, target_wida_level, status);

-- ============ item_options (answer keys: admin/service only) ============
CREATE TABLE public.item_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  rationale text
);
GRANT SELECT ON public.item_options TO authenticated;
GRANT ALL ON public.item_options TO service_role;
ALTER TABLE public.item_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item_options_admin_only" ON public.item_options FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_item_options_item ON public.item_options (item_id);

-- ============ can-do statements ============
CREATE TABLE public.can_do_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework text NOT NULL CHECK (framework IN ('NCSSFL-ACTFL','WIDA','CEFR')),
  skill_or_mode text NOT NULL,
  level text NOT NULL,
  statement text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.can_do_statements TO authenticated;
GRANT ALL ON public.can_do_statements TO service_role;
ALTER TABLE public.can_do_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "can_do_select" ON public.can_do_statements FOR SELECT TO authenticated USING (true);

CREATE TABLE public.item_can_do_map (
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  can_do_id uuid NOT NULL REFERENCES public.can_do_statements(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, can_do_id)
);
GRANT SELECT ON public.item_can_do_map TO authenticated;
GRANT ALL ON public.item_can_do_map TO service_role;
ALTER TABLE public.item_can_do_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item_can_do_admin_select" ON public.item_can_do_map FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============ item stats ============
CREATE TABLE public.item_stats (
  item_id uuid PRIMARY KEY REFERENCES public.items(id) ON DELETE CASCADE,
  p_value numeric,
  point_biserial numeric,
  irt_b numeric,
  irt_a numeric,
  se numeric,
  n_responses int NOT NULL DEFAULT 0,
  dif_flag boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.item_stats TO authenticated;
GRANT ALL ON public.item_stats TO service_role;
ALTER TABLE public.item_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item_stats_admin_select" ON public.item_stats FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============ blueprints / forms ============
CREATE TABLE public.blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  skill text NOT NULL CHECK (skill IN ('reading','listening')),
  grade_band text NOT NULL DEFAULT '6-8',
  n_items int NOT NULL DEFAULT 10,
  level_distribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blueprints TO authenticated;
GRANT ALL ON public.blueprints TO service_role;
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blueprints_admin_select" ON public.blueprints FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id uuid REFERENCES public.blueprints(id) ON DELETE SET NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.forms TO authenticated;
GRANT ALL ON public.forms TO service_role;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forms_select_live" ON public.forms FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.form_items (
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  is_trial boolean NOT NULL DEFAULT false,
  PRIMARY KEY (form_id, item_id)
);
GRANT SELECT ON public.form_items TO authenticated;
GRANT ALL ON public.form_items TO service_role;
ALTER TABLE public.form_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_items_admin_select" ON public.form_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============ embeddings (duplicate gate, backend only) ============
CREATE TABLE public.item_embeddings (
  item_id uuid PRIMARY KEY REFERENCES public.items(id) ON DELETE CASCADE,
  skill text NOT NULL,
  embedding jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.item_embeddings TO service_role;
ALTER TABLE public.item_embeddings ENABLE ROW LEVEL SECURITY;