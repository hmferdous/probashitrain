-- Batch structural changes for: draft-save, auto-generated batch codes, and
-- retiring published_to_ami_probashi in favor of the richer status enum.

-- Draft batches only require a name — dates aren't known yet.
ALTER TABLE public.batches ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE public.batches ALTER COLUMN end_date DROP NOT NULL;

-- Tags are course-only now (see courses.tags); batch cards read the parent
-- course's tags for display instead of storing their own copy.
ALTER TABLE public.batches DROP COLUMN IF EXISTS tags;

-- Existing rows created under the old two-state model ('draft' meant "created,
-- not yet published") map to the new 'unpublished' state — under the new
-- model 'draft' means "still being filled out," which no pre-existing row is.
UPDATE public.batches SET status = 'unpublished' WHERE status = 'draft';

-- published_to_ami_probashi is now redundant with status; the enum is the
-- single source of truth (unpublished -> under_review -> published).
ALTER TABLE public.batches DROP COLUMN IF EXISTS published_to_ami_probashi;

-- Human-readable batch code, e.g. BATCH-000123. Same pattern as courses.code:
-- assigned by trigger only on actual insert, so an abandoned draft never
-- burns a sequence number.
CREATE SEQUENCE IF NOT EXISTS public.batch_code_seq START 1;

ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS code text;

CREATE OR REPLACE FUNCTION public.set_batch_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'BATCH-' || lpad(nextval('public.batch_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS batches_set_code ON public.batches;
CREATE TRIGGER batches_set_code
BEFORE INSERT ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.set_batch_code();

-- Backfill existing rows
UPDATE public.batches
SET code = 'BATCH-' || lpad(nextval('public.batch_code_seq')::text, 6, '0')
WHERE code IS NULL OR code = '';

ALTER TABLE public.batches ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS batches_code_unique ON public.batches(code);

-- Read-only peek at the code the *next* batch will get, without consuming
-- the sequence — used to preview the ID in the creation form before saving.
CREATE OR REPLACE FUNCTION public.peek_next_batch_code()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT 'BATCH-' || lpad((last_value + CASE WHEN is_called THEN 1 ELSE 0 END)::text, 6, '0')
  FROM public.batch_code_seq;
$$;

GRANT EXECUTE ON FUNCTION public.peek_next_batch_code() TO authenticated;
