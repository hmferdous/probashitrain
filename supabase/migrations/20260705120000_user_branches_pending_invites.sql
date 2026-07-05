-- User-branch assignments (instructor → branch scoping)
CREATE TABLE IF NOT EXISTS public.user_branches (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  center_id uuid NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, branch_id)
);

GRANT SELECT, INSERT, DELETE ON public.user_branches TO authenticated;
GRANT ALL ON public.user_branches TO service_role;

ALTER TABLE public.user_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "center members view user_branches" ON public.user_branches
  FOR SELECT TO authenticated
  USING (center_id = public.get_user_center(auth.uid()));

CREATE POLICY "admins manage user_branches" ON public.user_branches
  FOR ALL TO authenticated
  USING (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
  WITH CHECK (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'));

-- Pending invites (demo-mode: admin generates link, no email sent)
CREATE TABLE IF NOT EXISTS public.pending_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id  uuid NOT NULL REFERENCES public.training_centers(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       public.app_role NOT NULL DEFAULT 'instructor',
  token      text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_invites TO authenticated;
GRANT ALL ON public.pending_invites TO service_role;

ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage pending_invites" ON public.pending_invites
  FOR ALL TO authenticated
  USING (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
  WITH CHECK (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'));
