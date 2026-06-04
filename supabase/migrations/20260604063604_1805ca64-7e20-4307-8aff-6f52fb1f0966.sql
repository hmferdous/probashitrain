
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL,
  name_en text NOT NULL,
  name_bn text NOT NULL,
  address_en text NOT NULL,
  address_bn text NOT NULL,
  map_link text,
  phone text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "center members view branches" ON public.branches
  FOR SELECT TO authenticated
  USING (center_id = public.get_user_center(auth.uid()));

CREATE POLICY "admins manage branches" ON public.branches
  FOR ALL TO authenticated
  USING (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'))
  WITH CHECK (center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.batch_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  capacity integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, branch_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_branches TO authenticated;
GRANT ALL ON public.batch_branches TO service_role;

ALTER TABLE public.batch_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "center members view batch branches" ON public.batch_branches
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.batches b WHERE b.id = batch_branches.batch_id AND b.center_id = public.get_user_center(auth.uid())));

CREATE POLICY "admins manage batch branches" ON public.batch_branches
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.batches b WHERE b.id = batch_branches.batch_id AND b.center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.batches b WHERE b.id = batch_branches.batch_id AND b.center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin')));
