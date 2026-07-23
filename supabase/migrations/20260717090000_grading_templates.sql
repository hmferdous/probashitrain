-- Grading templates: institutes define their own grading scheme (numeric
-- score range, optionally with display bands like letter grades; or a
-- pure ordered label scale with no number at all) and later attach one to
-- a batch. This migration only builds the template system itself —
-- attaching a template to a batch and reworking the Grade dialog to use
-- it come in a later migration.

DO $$ BEGIN
  CREATE TYPE public.grading_template_type AS ENUM ('numeric', 'scale');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE public.grading_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
  name text NOT NULL,
  type public.grading_template_type NOT NULL,
  -- Only meaningful when type = 'numeric'. Null for 'scale' templates —
  -- those have no number at all, ever.
  min_score numeric(6,2),
  max_score numeric(6,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.grading_bands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.grading_templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  -- Only meaningful for 'numeric' templates that choose to show a derived
  -- label (e.g. 90-100 -> "A+"). Null/unused for 'scale' templates, where
  -- the band IS the selectable option and sort_order is the only ranking.
  min_value numeric(6,2),
  max_value numeric(6,2),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grading_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grading_bands TO authenticated;
GRANT ALL ON public.grading_templates TO service_role;
GRANT ALL ON public.grading_bands TO service_role;

ALTER TABLE public.grading_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_bands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "center members view grading templates" ON public.grading_templates
  FOR SELECT TO authenticated USING (center_id = public.get_user_center(auth.uid()));
CREATE POLICY "admins manage grading templates" ON public.grading_templates
  FOR ALL TO authenticated
  USING (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
  WITH CHECK (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'));

CREATE POLICY "center members view grading bands" ON public.grading_bands
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.grading_templates t WHERE t.id = grading_bands.template_id AND t.center_id = public.get_user_center(auth.uid())));
CREATE POLICY "admins manage grading bands" ON public.grading_bands
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.grading_templates t WHERE t.id = grading_bands.template_id AND t.center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.grading_templates t WHERE t.id = grading_bands.template_id AND t.center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin')));

CREATE TRIGGER update_grading_templates_updated_at BEFORE UPDATE ON public.grading_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed three starter templates (editable/deletable afterwards) for a given center.
CREATE OR REPLACE FUNCTION public.seed_default_grading_templates(_center_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _letter_id uuid;
  _pass_fail_id uuid;
BEGIN
  INSERT INTO public.grading_templates (center_id, name, type, min_score, max_score)
  VALUES (_center_id, 'Percentage', 'numeric', 0, 100);

  INSERT INTO public.grading_templates (center_id, name, type, min_score, max_score)
  VALUES (_center_id, 'Letter Grade (A-F)', 'numeric', 0, 100)
  RETURNING id INTO _letter_id;
  INSERT INTO public.grading_bands (template_id, label, min_value, max_value, sort_order) VALUES
    (_letter_id, 'A+', 90, 100, 1),
    (_letter_id, 'A',  80, 89,  2),
    (_letter_id, 'B',  70, 79,  3),
    (_letter_id, 'C',  60, 69,  4),
    (_letter_id, 'D',  50, 59,  5),
    (_letter_id, 'F',  0,  49,  6);

  INSERT INTO public.grading_templates (center_id, name, type)
  VALUES (_center_id, 'Pass / Fail', 'scale')
  RETURNING id INTO _pass_fail_id;
  INSERT INTO public.grading_bands (template_id, label, sort_order) VALUES
    (_pass_fail_id, 'Pass', 1),
    (_pass_fail_id, 'Fail', 2);
END;
$$;

-- Extend onboarding to seed these for every new center, same pattern as the default branch.
CREATE OR REPLACE FUNCTION public.create_training_center(_name text, _phone text, _address text)
RETURNS public.training_centers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _center public.training_centers;
  _email text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND center_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already belongs to a training center';
  END IF;

  INSERT INTO public.training_centers (name, phone, address)
  VALUES (_name, NULLIF(_phone, ''), NULLIF(_address, ''))
  RETURNING * INTO _center;

  UPDATE public.profiles SET center_id = _center.id WHERE id = _uid;

  INSERT INTO public.user_roles (user_id, role, center_id)
  VALUES (_uid, 'center_admin', _center.id)
  ON CONFLICT DO NOTHING;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  INSERT INTO public.branches (center_id, name_en, name_bn, address_en, address_bn, phone, email)
  VALUES (
    _center.id,
    'Main Branch',
    'মূল শাখা',
    COALESCE(NULLIF(_address, ''), ''),
    COALESCE(NULLIF(_address, ''), ''),
    COALESCE(NULLIF(_phone, ''), ''),
    COALESCE(_email, '')
  );

  PERFORM public.seed_default_grading_templates(_center.id);

  RETURN _center;
END;
$$;

-- Backfill: give any existing center with zero grading templates the starter set too.
DO $$
DECLARE
  _center record;
BEGIN
  FOR _center IN SELECT id FROM public.training_centers tc WHERE NOT EXISTS (SELECT 1 FROM public.grading_templates gt WHERE gt.center_id = tc.id)
  LOOP
    PERFORM public.seed_default_grading_templates(_center.id);
  END LOOP;
END $$;
