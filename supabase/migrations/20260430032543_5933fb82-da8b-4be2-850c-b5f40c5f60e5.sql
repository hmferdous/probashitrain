CREATE OR REPLACE FUNCTION public.create_training_center(_name text, _phone text, _address text)
RETURNS public.training_centers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _center public.training_centers;
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

  RETURN _center;
END;
$$;