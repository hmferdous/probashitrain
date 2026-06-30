DO $$ BEGIN
  CREATE TYPE public.eligibility_gender AS ENUM ('any', 'male', 'female');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.education_level AS ENUM (
    'none', 'jsc', 'ssc', 'hsc', 'diploma', 'bachelors', 'masters'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fee_collection_method AS ENUM ('ami_probashi', 'manual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description_bn text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS eligibility_gender public.eligibility_gender;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS eligibility_min_age integer;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS eligibility_max_age integer;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS eligibility_education public.education_level;

ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS application_deadline date;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS fee_collection public.fee_collection_method NOT NULL DEFAULT 'manual';

-- Auto-unpublish batches from the Ami Probashi app once their application deadline passes.
CREATE OR REPLACE FUNCTION public.unpublish_expired_batches()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.batches
  SET published_to_ami_probashi = false
  WHERE published_to_ami_probashi = true
    AND application_deadline IS NOT NULL
    AND application_deadline < CURRENT_DATE;
$$;

-- Requires the pg_cron extension enabled (Supabase dashboard → Database → Extensions).
-- If it isn't enabled yet, this block no-ops instead of failing the whole migration;
-- enable pg_cron and rerun the schedule below manually.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'unpublish-expired-batches') THEN
    PERFORM cron.schedule(
      'unpublish-expired-batches',
      '0 0 * * *',
      $cron$ SELECT public.unpublish_expired_batches(); $cron$
    );
  END IF;
EXCEPTION
  WHEN undefined_table OR undefined_function OR invalid_schema_name THEN
    RAISE NOTICE 'pg_cron not enabled — skipping schedule for unpublish_expired_batches(). Enable pg_cron in Supabase dashboard, then run: SELECT cron.schedule(''unpublish-expired-batches'', ''0 0 * * *'', ''SELECT public.unpublish_expired_batches();'');';
END $$;
