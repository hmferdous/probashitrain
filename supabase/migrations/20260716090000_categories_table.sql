-- Categories become a real table instead of a free-text column on courses,
-- so category-based reporting/dashboard analytics can join cleanly and a
-- rename updates everywhere instead of leaving stale duplicate strings.

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (center_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "center members view categories" ON public.categories
  FOR SELECT TO authenticated USING (center_id = public.get_user_center(auth.uid()));
CREATE POLICY "admins manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
  WITH CHECK (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'));

-- Backfill: turn each distinct existing courses.category string into a row here.
INSERT INTO public.categories (center_id, name)
SELECT DISTINCT center_id, category FROM public.courses
WHERE category IS NOT NULL AND btrim(category) <> ''
ON CONFLICT (center_id, name) DO NOTHING;

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

UPDATE public.courses c
SET category_id = cat.id
FROM public.categories cat
WHERE cat.center_id = c.center_id AND cat.name = c.category;

ALTER TABLE public.courses DROP COLUMN IF EXISTS category;
