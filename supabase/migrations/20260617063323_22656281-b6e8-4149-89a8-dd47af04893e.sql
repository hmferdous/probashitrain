
CREATE SEQUENCE IF NOT EXISTS public.course_code_seq START 1;

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS code text;

CREATE OR REPLACE FUNCTION public.set_course_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'CRS-' || lpad(nextval('public.course_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS courses_set_code ON public.courses;
CREATE TRIGGER courses_set_code
BEFORE INSERT ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.set_course_code();

-- Backfill existing rows
UPDATE public.courses
SET code = 'CRS-' || lpad(nextval('public.course_code_seq')::text, 6, '0')
WHERE code IS NULL OR code = '';

ALTER TABLE public.courses ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS courses_code_unique ON public.courses(code);
