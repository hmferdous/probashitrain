-- Auto-create a default branch when a center is onboarded, and backfill any
-- existing center that has none. Batch creation hard-requires at least one
-- branch, but nothing in onboarding ever told a new admin to add one first —
-- this removes that hidden prerequisite entirely instead of just documenting it.
-- Branch fields are all editable afterwards from Branches management.

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

  RETURN _center;
END;
$$;

-- Backfill centers that were onboarded before this migration and have zero branches.
INSERT INTO public.branches (center_id, name_en, name_bn, address_en, address_bn, phone, email)
SELECT
  tc.id,
  'Main Branch',
  'মূল শাখা',
  COALESCE(tc.address, ''),
  COALESCE(tc.address, ''),
  COALESCE(tc.phone, ''),
  COALESCE((
    SELECT au.email FROM public.user_roles ur
    JOIN auth.users au ON au.id = ur.user_id
    WHERE ur.center_id = tc.id AND ur.role = 'center_admin'
    ORDER BY ur.id LIMIT 1
  ), '')
FROM public.training_centers tc
WHERE NOT EXISTS (SELECT 1 FROM public.branches b WHERE b.center_id = tc.id);
