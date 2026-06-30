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

DO $$ BEGIN
  CREATE TYPE public.duration_unit AS ENUM ('hours', 'days', 'weeks', 'months');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Course-level defaults/templates. These seed new batches at creation time.
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS description_bn text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS requirements_text text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS eligibility_gender public.eligibility_gender;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS eligibility_min_age integer;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS eligibility_max_age integer;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS eligibility_education public.education_level;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS duration_value integer;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS duration_unit public.duration_unit;

CREATE TABLE IF NOT EXISTS public.course_document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  doc_type public.document_type NOT NULL DEFAULT 'other',
  mandatory boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_document_requirements TO authenticated;
GRANT ALL ON public.course_document_requirements TO service_role;

ALTER TABLE public.course_document_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "center members view course document requirements" ON public.course_document_requirements
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_document_requirements.course_id AND c.center_id = public.get_user_center(auth.uid())));

CREATE POLICY "admins manage course document requirements" ON public.course_document_requirements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_document_requirements.course_id AND c.center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_document_requirements.course_id AND c.center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin')));

-- Batch-level editable copies. Auto-populated from the course at batch creation,
-- then editable per batch. The Ami Probashi app reads from these batch columns,
-- not from the course, so one course can run as multiple differently-tagged batches.
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS description_bn text;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS requirements_text text;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS eligibility_gender public.eligibility_gender;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS eligibility_min_age integer;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS eligibility_max_age integer;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS eligibility_education public.education_level;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS duration_value integer;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS duration_unit public.duration_unit;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS price numeric(10,2);
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS application_deadline date;
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS fee_collection public.fee_collection_method NOT NULL DEFAULT 'manual';
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE TABLE IF NOT EXISTS public.batch_document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  doc_type public.document_type NOT NULL DEFAULT 'other',
  mandatory boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_document_requirements TO authenticated;
GRANT ALL ON public.batch_document_requirements TO service_role;

ALTER TABLE public.batch_document_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "center members view batch document requirements" ON public.batch_document_requirements
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.batches b WHERE b.id = batch_document_requirements.batch_id AND b.center_id = public.get_user_center(auth.uid())));

CREATE POLICY "admins manage batch document requirements" ON public.batch_document_requirements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.batches b WHERE b.id = batch_document_requirements.batch_id AND b.center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.batches b WHERE b.id = batch_document_requirements.batch_id AND b.center_id = public.get_user_center(auth.uid()) AND public.has_role(auth.uid(), 'center_admin')));

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
