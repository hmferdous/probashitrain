-- Re-grant EXECUTE on helper functions used inside RLS policies.
-- These are SECURITY DEFINER and only read role/center info for the current user,
-- so granting EXECUTE to authenticated is safe and required for RLS to work.
GRANT EXECUTE ON FUNCTION public.get_user_center(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;