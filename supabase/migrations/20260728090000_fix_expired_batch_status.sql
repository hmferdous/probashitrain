-- Keep expired batches off the Ami Probashi app using the current status-based
-- lifecycle. The retired published_to_ami_probashi column was removed in
-- 20260716093000_batch_lifecycle_and_code.sql.
CREATE OR REPLACE FUNCTION public.unpublish_expired_batches()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.batches
  SET status = 'unpublished'
  WHERE status = 'published'
    AND application_deadline IS NOT NULL
    AND application_deadline < CURRENT_DATE;
$$;
