-- Phone number must be unique within a training center.
-- NULLs are excluded from the constraint (phone is optional).
CREATE UNIQUE INDEX IF NOT EXISTS students_center_phone_unique
  ON public.students (center_id, phone)
  WHERE phone IS NOT NULL;
