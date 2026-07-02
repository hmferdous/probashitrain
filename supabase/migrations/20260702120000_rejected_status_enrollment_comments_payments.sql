-- Add rejected to pipeline_status enum
ALTER TYPE public.pipeline_status ADD VALUE IF NOT EXISTS 'rejected';

-- Enrollment comments
CREATE TABLE IF NOT EXISTS public.enrollment_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_comments TO authenticated;
GRANT ALL ON public.enrollment_comments TO service_role;

ALTER TABLE public.enrollment_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "center members view enrollment comments" ON public.enrollment_comments
  FOR SELECT TO authenticated
  USING (center_id = public.get_user_center(auth.uid()));

CREATE POLICY "center members add enrollment comments" ON public.enrollment_comments
  FOR INSERT TO authenticated
  WITH CHECK (center_id = public.get_user_center(auth.uid()));

CREATE POLICY "admins delete enrollment comments" ON public.enrollment_comments
  FOR DELETE TO authenticated
  USING (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'));
