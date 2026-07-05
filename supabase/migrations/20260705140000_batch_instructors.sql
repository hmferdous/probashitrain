-- Multiple instructors per batch
CREATE TABLE IF NOT EXISTS public.batch_instructors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id   uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  center_id  uuid NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.batch_instructors TO authenticated;
GRANT ALL ON public.batch_instructors TO service_role;

ALTER TABLE public.batch_instructors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "center members view batch_instructors" ON public.batch_instructors
  FOR SELECT TO authenticated
  USING (center_id = public.get_user_center(auth.uid()));

CREATE POLICY "admins manage batch_instructors" ON public.batch_instructors
  FOR ALL TO authenticated
  USING (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
  WITH CHECK (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'));
