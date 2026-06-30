
-- 1. Remove privilege escalation: drop self-insert policy on user_roles.
-- Roles are assigned only via create_training_center (SECURITY DEFINER) or by center admins.
DROP POLICY IF EXISTS "users insert own roles on signup" ON public.user_roles;

-- 2. Remove always-true insert policy on training_centers.
-- Centers are created exclusively through the SECURITY DEFINER function create_training_center.
DROP POLICY IF EXISTS "anyone can create a center" ON public.training_centers;

-- 3. Lock down SECURITY DEFINER helper/trigger functions: revoke EXECUTE from public/anon/authenticated.
-- Trigger functions are invoked by the table owner, not callers, so revoking EXECUTE does not break triggers.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_course_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_no() FROM PUBLIC, anon, authenticated;

-- has_role and get_user_center are only used inside RLS policies (planner evaluates them in the
-- table owner's context), so clients do not need direct EXECUTE.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_center(uuid) FROM PUBLIC, anon, authenticated;

-- create_training_center must remain callable by signed-in users (it is the onboarding entry point).
REVOKE EXECUTE ON FUNCTION public.create_training_center(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_training_center(text, text, text) TO authenticated;
