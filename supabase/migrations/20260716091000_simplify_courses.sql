-- Course creation goes back to barebone: title, description, category, tags,
-- and materials. Everything scheduling/eligibility/fee related belongs solely
-- to the batch now — no more copying the same field onto both tables.
-- (duration/price/cover image were course-level fields that were never
-- actually surfaced as batch-copyable defaults in a useful way; they move to
-- being purely batch-specific, and course drops them rather than keep an
-- unused duplicate.)

ALTER TABLE public.courses DROP COLUMN IF EXISTS description_bn;
ALTER TABLE public.courses DROP COLUMN IF EXISTS requirements_text;
ALTER TABLE public.courses DROP COLUMN IF EXISTS eligibility_gender;
ALTER TABLE public.courses DROP COLUMN IF EXISTS eligibility_min_age;
ALTER TABLE public.courses DROP COLUMN IF EXISTS eligibility_max_age;
ALTER TABLE public.courses DROP COLUMN IF EXISTS eligibility_education;
ALTER TABLE public.courses DROP COLUMN IF EXISTS duration_value;
ALTER TABLE public.courses DROP COLUMN IF EXISTS duration_unit;
ALTER TABLE public.courses DROP COLUMN IF EXISTS duration_hours;
ALTER TABLE public.courses DROP COLUMN IF EXISTS price;
ALTER TABLE public.courses DROP COLUMN IF EXISTS cover_image_url;

DROP TABLE IF EXISTS public.course_document_requirements;
